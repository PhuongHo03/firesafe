import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import cv2

from src.backend_client import BackendClient
from src.detector import YoloDetector
from src.snapshot import encode_png
from src.storage import MinioSnapshotStorage


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


class CameraWorker:
    def __init__(self, config: CameraWorkerConfig):
        self.config = config
        self._stop_event = threading.Event()
        self._reader_thread: Optional[threading.Thread] = None
        self._detector_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._latest_frame = None
        self._latest_jpeg: Optional[bytes] = None
        self._running = False
        self._error: Optional[str] = None
        self._last_alert_at: Optional[str] = None

    def start(self):
        if self._reader_thread and self._reader_thread.is_alive():
            return
        self._reader_thread = threading.Thread(target=self._read_loop, daemon=True)
        self._detector_thread = threading.Thread(target=self._detect_loop, daemon=True)
        self._reader_thread.start()
        self._detector_thread.start()

    def stop(self):
        self._stop_event.set()
        if self._reader_thread:
            self._reader_thread.join(timeout=5)
        if self._detector_thread:
            self._detector_thread.join(timeout=5)

    def status(self) -> dict:
        with self._lock:
            return {
                "cameraId": self.config.camera_id,
                "running": self._running,
                "error": self._error,
                "lastAlertAt": self._last_alert_at,
                "hasFrame": self._latest_jpeg is not None,
            }

    def latest_jpeg(self) -> Optional[bytes]:
        with self._lock:
            return self._latest_jpeg

    def _set_status(self, running: bool, error: Optional[str]):
        with self._lock:
            self._running = running
            self._error = error

    def _set_frame(self, frame):
        ok, buffer = cv2.imencode(".jpg", frame)
        if ok:
            with self._lock:
                self._latest_frame = frame.copy()
                self._latest_jpeg = buffer.tobytes()

    def _get_frame(self):
        with self._lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None

    def _read_loop(self):
        reconnect_delay = self.config.reconnect_delay_seconds
        max_reconnect_delay = 30.0
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;10000000"

        while not self._stop_event.is_set():
            capture = cv2.VideoCapture(self.config.rtsp_url, cv2.CAP_FFMPEG)
            if not capture.isOpened():
                self._set_status(False, f"Cannot open RTSP stream; retrying in {reconnect_delay:.0f}s")
                self._stop_event.wait(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, max_reconnect_delay)
                continue

            reconnect_delay = self.config.reconnect_delay_seconds
            self._set_status(True, None)
            try:
                while not self._stop_event.is_set():
                    ok, frame = capture.read()
                    if not ok or frame is None:
                        self._set_status(False, "RTSP frame read failed")
                        break
                    self._set_frame(frame)
            except Exception as exc:
                self._set_status(False, str(exc))
            finally:
                capture.release()

            if not self._stop_event.is_set():
                self._stop_event.wait(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, max_reconnect_delay)

        self._set_status(False, None)

    def _detect_loop(self):
        detector = YoloDetector(Path(self.config.model_path))
        backend = BackendClient(self.config.backend_url, self.config.username, self.config.password)
        storage = MinioSnapshotStorage(
            self.config.minio_url,
            self.config.minio_access_key,
            self.config.minio_secret_key,
            self.config.minio_bucket,
        )
        backend.login()

        last_alert_at = 0.0
        while not self._stop_event.wait(self.config.detection_interval_seconds):
            frame = self._get_frame()
            if frame is None:
                continue

            results = detector.predict_frame(frame, conf=self.config.conf)
            result = results[0] if results else None
            if result is None or result.boxes is None or len(result.boxes) == 0:
                continue

            annotated_frame = result.plot()
            self._set_frame(annotated_frame)
            confidences = result.boxes.conf
            best_index = int(confidences.argmax().item())
            class_id = int(result.boxes.cls[best_index].item())
            confidence = float(confidences[best_index].item())
            label = result.names.get(class_id, str(class_id))

            now = time.monotonic()
            if now - last_alert_at >= self.config.alert_cooldown_seconds:
                image_url = storage.upload(self.config.camera_id, label, encode_png(annotated_frame))
                backend.create_alert(self.config.camera_id, label, confidence, image_url)
                last_alert_at = now
                with self._lock:
                    self._last_alert_at = datetime.now(timezone.utc).isoformat()
