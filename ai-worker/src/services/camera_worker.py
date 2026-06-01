import os
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Sequence

import cv2

from src.repositories.backend_client import BackendClient
from src.services.inference_scheduler import InferenceCandidate, InferenceResult
from src.utils.snapshot import encode_png
from src.repositories.storage import MinioSnapshotStorage

RTSP_OPEN_LOCK = threading.Lock()
HIKVISION_CHANNEL_RE = re.compile(r"(/Streaming/Channels/)(\d+)(\b|[/?#])", re.IGNORECASE)


def rtsp_url_variants(rtsp_url: str) -> list[str]:
    match = HIKVISION_CHANNEL_RE.search(rtsp_url)
    if not match:
        return [rtsp_url]

    channel = match.group(2)
    if not channel.endswith("01"):
        return [rtsp_url]

    substream_channel = f"{channel[:-2]}02"
    substream_url = rtsp_url[: match.start(2)] + substream_channel + rtsp_url[match.end(2) :]
    return [rtsp_url, substream_url] if substream_url != rtsp_url else [rtsp_url]


@dataclass(frozen=True)
class CameraWorkerConfig:
    camera_id: int
    rtsp_url: str
    model_path: str
    conf: float
    backend_url: str
    username: str
    password: str
    minio_url: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    alert_cooldown_seconds: float
    detection_interval_seconds: float
    reconnect_delay_seconds: float
    rtsp_transports: Sequence[str]
    rtsp_buffer_size: int
    overlay_ttl_seconds: float
    sustained_detection_seconds: float


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    xyxy: tuple[float, float, float, float]


class SharedRtspSource:
    def __init__(self, config: CameraWorkerConfig):
        self.config = config
        self._stop_event = threading.Event()
        self._reader_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._latest_frame = None
        self._latest_jpeg: Optional[bytes] = None
        self._frame_seq = 0
        self._latest_frame_at = 0.0
        self._running = False
        self._error: Optional[str] = None
        self._last_logged_status: tuple[bool, Optional[str]] | None = None

    def start(self):
        if self._reader_thread and self._reader_thread.is_alive():
            return
        self._reader_thread = threading.Thread(target=self._read_loop, daemon=True)
        self._reader_thread.start()

    def stop(self):
        self._stop_event.set()
        if self._reader_thread:
            self._reader_thread.join(timeout=5)

    def status(self) -> tuple[bool, Optional[str], bool]:
        with self._lock:
            return self._running, self._error, self._latest_jpeg is not None

    def latest_jpeg(self) -> Optional[bytes]:
        with self._lock:
            return self._latest_jpeg

    def get_frame(self):
        snapshot = self.get_frame_snapshot()
        return snapshot[0] if snapshot else None

    def get_frame_snapshot(self):
        with self._lock:
            if self._latest_frame is None:
                return None
            return self._latest_frame.copy(), self._frame_seq, self._latest_frame_at

    def _set_status(self, running: bool, error: Optional[str]):
        status = (running, error)
        with self._lock:
            self._running = running
            self._error = error
            should_log = self._last_logged_status != status
            if should_log:
                self._last_logged_status = status
        if should_log:
            state = "running" if running else "stopped"
            detail = f" error={error}" if error else ""
            print(f"camera={self.config.camera_id} source={state}{detail}", flush=True)

    def _set_frame(self, frame):
        ok, buffer = cv2.imencode(".jpg", frame)
        if ok:
            with self._lock:
                self._latest_frame = frame.copy()
                self._latest_jpeg = buffer.tobytes()
                self._frame_seq += 1
                self._latest_frame_at = time.monotonic()

    def _open_capture(self, rtsp_url: str, transport: str):
        with RTSP_OPEN_LOCK:
            if transport == "default":
                os.environ.pop("OPENCV_FFMPEG_CAPTURE_OPTIONS", None)
            else:
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{transport}|stimeout;10000000"
            capture = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

        if self.config.rtsp_buffer_size > 0:
            capture.set(cv2.CAP_PROP_BUFFERSIZE, self.config.rtsp_buffer_size)
        return capture

    def _read_loop(self):
        reconnect_delay = self.config.reconnect_delay_seconds
        max_reconnect_delay = 30.0

        urls = rtsp_url_variants(self.config.rtsp_url)
        while not self._stop_event.is_set():
            opened = False
            for url_index, rtsp_url in enumerate(urls):
                if self._stop_event.is_set():
                    break

                stream_name = "substream" if url_index else "mainstream"
                for transport in self.config.rtsp_transports:
                    if self._stop_event.is_set():
                        break

                    print(f"camera={self.config.camera_id} opening {stream_name} transport={transport}", flush=True)
                    capture = self._open_capture(rtsp_url, transport)
                    if not capture.isOpened():
                        capture.release()
                        self._set_status(False, f"Cannot open {stream_name} RTSP stream via {transport}")
                        continue

                    reconnect_delay = self.config.reconnect_delay_seconds
                    self._set_status(True, None)
                    try:
                        while not self._stop_event.is_set():
                            ok, frame = capture.read()
                            if not ok or frame is None:
                                self._set_status(False, f"RTSP frame read failed via {transport}")
                                break
                            opened = True
                            self._set_frame(frame)
                    except Exception as exc:
                        self._set_status(False, str(exc))
                    finally:
                        capture.release()

                    if opened or self._stop_event.is_set():
                        break

                if opened or self._stop_event.is_set():
                    break

            if not self._stop_event.is_set():
                if not opened:
                    self._set_status(False, f"Cannot open RTSP stream; retrying in {reconnect_delay:.0f}s")
                self._stop_event.wait(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, max_reconnect_delay)

        self._set_status(False, None)


class CameraWorker:
    def __init__(self, config: CameraWorkerConfig, source: SharedRtspSource, scheduler):
        self.config = config
        self._source = source
        self._scheduler = scheduler
        self._running = False
        self._lock = threading.Lock()
        self._latest_detections: list[Detection] = []
        self._latest_detection_at = 0.0
        self._sustained_detection_started_at: float | None = None
        self._last_alert_sent_at = 0.0
        self._last_alert_at: Optional[str] = None
        self._started_at = datetime.now(timezone.utc).isoformat()
        self._detections_total = 0
        self._alerts_sent_total = 0
        self._inference_count = 0
        self._inference_ms_total = 0.0
        self._last_submitted_frame_seq = 0
        self._last_processed_frame_seq = 0
        self._last_inference_submitted_at = 0.0
        self._backend: BackendClient | None = None
        self._storage: MinioSnapshotStorage | None = None

    def start(self):
        if self._running:
            return
        self._backend = BackendClient(self.config.backend_url, self.config.username, self.config.password)
        self._storage = MinioSnapshotStorage(
            self.config.minio_url,
            self.config.minio_access_key,
            self.config.minio_secret_key,
            self.config.minio_bucket,
        )
        self._backend.login()
        self._running = True
        self._scheduler.register(self)

    def stop(self):
        self._running = False
        self._scheduler.unregister(self.config.camera_id)

    def status(self) -> dict:
        running, error, has_frame = self._source.status()
        with self._lock:
            return {
                "cameraId": self.config.camera_id,
                "running": self._running and running,
                "error": error,
                "lastAlertAt": self._last_alert_at,
                "hasFrame": has_frame,
                "startedAt": self._started_at,
                "detectionsTotal": self._detections_total,
                "alertsSentTotal": self._alerts_sent_total,
                "inferenceMsAvg": (self._inference_ms_total / self._inference_count) if self._inference_count else 0.0,
            }

    def latest_jpeg(self) -> Optional[bytes]:
        frame = self._source.get_frame()
        if frame is None:
            return self._source.latest_jpeg()

        display_frame = self._draw_active_detections(frame)
        ok, buffer = cv2.imencode(".jpg", display_frame)
        return buffer.tobytes() if ok else self._source.latest_jpeg()

    def _get_frame(self):
        return self._source.get_frame()

    def inference_candidate(self, now: float) -> Optional[InferenceCandidate]:
        if not self._running:
            return None
        if now - self._last_inference_submitted_at < self.config.detection_interval_seconds:
            return None
        snapshot = self._source.get_frame_snapshot()
        if snapshot is None:
            return None
        frame, frame_seq, captured_at = snapshot
        if frame_seq <= self._last_submitted_frame_seq or frame_seq <= self._last_processed_frame_seq:
            return None
        return InferenceCandidate(
            camera_id=self.config.camera_id,
            frame=frame,
            frame_seq=frame_seq,
            captured_at=captured_at,
            conf=self.config.conf,
        )

    def mark_inference_submitted(self, frame_seq: int, now: float):
        with self._lock:
            self._last_submitted_frame_seq = frame_seq
            self._last_inference_submitted_at = now

    def _draw_active_detections(self, frame):
        now = time.monotonic()
        with self._lock:
            detections = list(self._latest_detections) if now - self._latest_detection_at <= self.config.overlay_ttl_seconds else []
        return self._draw_detections(frame, detections)

    def _draw_detections(self, frame, detections: list[Detection]):
        annotated = frame.copy()
        for detection in detections:
            x1, y1, x2, y2 = (int(value) for value in detection.xyxy)
            color = (0, 0, 255) if detection.label == "fire" else (0, 165, 255)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            text = f"{detection.label} {detection.confidence:.2f}"
            cv2.putText(annotated, text, (x1, max(y1 - 8, 16)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        return annotated

    def _set_detections(self, detections: list[Detection], now: float):
        with self._lock:
            self._latest_detections = detections
            self._latest_detection_at = now

    def _detections(self, result) -> list[Detection]:
        if result is None or result.boxes is None or len(result.boxes) == 0:
            return []

        detections: list[Detection] = []
        for index in range(len(result.boxes)):
            class_id = int(result.boxes.cls[index].item())
            confidence = float(result.boxes.conf[index].item())
            label = result.names.get(class_id, str(class_id))
            xyxy = tuple(float(value) for value in result.boxes.xyxy[index].tolist())
            detections.append(Detection(label=label, confidence=confidence, xyxy=xyxy))
        return detections

    def handle_inference_result(self, result: InferenceResult):
        if not self._running or result.frame_seq <= self._last_processed_frame_seq:
            return
        if result.error:
            with self._lock:
                self._last_processed_frame_seq = result.frame_seq
            print(f"camera={self.config.camera_id} inference error={result.error}", flush=True)
            return

        now = time.monotonic()
        detections = self._detections(result.result)
        with self._lock:
            self._last_processed_frame_seq = result.frame_seq
            self._inference_count += 1
            self._inference_ms_total += result.inference_ms
            self._detections_total += len(detections)
        self._set_detections(detections, now)
        if not detections:
            self._sustained_detection_started_at = None
            return

        if self._sustained_detection_started_at is None:
            self._sustained_detection_started_at = now
        if now - self._sustained_detection_started_at < self.config.sustained_detection_seconds:
            return
        if now - self._last_alert_sent_at < self.config.alert_cooldown_seconds:
            return

        if not self._backend or not self._storage:
            return

        detection = max(detections, key=lambda item: item.confidence)
        reservation = self._backend.reserve_alert(self.config.camera_id, detection.label)
        self._last_alert_sent_at = now
        if not reservation.get("reserved"):
            return

        annotated_frame = self._draw_detections(result.frame, detections)
        image_url = self._storage.upload(self.config.camera_id, detection.label, encode_png(annotated_frame))
        self._backend.create_alert(self.config.camera_id, detection.label, detection.confidence, image_url, reservation["reservationToken"])
        with self._lock:
            self._alerts_sent_total += 1
            self._last_alert_at = datetime.now(timezone.utc).isoformat()
