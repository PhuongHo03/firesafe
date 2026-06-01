import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from src.services.camera_worker import CameraWorker, CameraWorkerConfig, SharedRtspSource
from src.services.inference_scheduler import InferenceScheduler

WORKERS: dict[int, CameraWorker] = {}
SOURCES: dict[str, tuple[SharedRtspSource, int]] = {}
WORKERS_LOCK = threading.Lock()
STATUS_CACHE: dict[int, tuple[float, dict]] = {}
STATUS_CACHE_TTL_SECONDS = float(os.getenv("AI_WORKER_STATUS_CACHE_TTL_SECONDS", "1"))
STREAM_RE = re.compile(r"^/api/cameras/(\d+)/stream\.mjpg$")
STATUS_RE = re.compile(r"^/api/cameras/(\d+)/status$")


class AIWorkerHandler(BaseHTTPRequestHandler):
    server_version = "FireSafeAIWorker/0.1"

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._json(200, {"status": "UP"})
            return
        if path == "/api/monitoring/summary":
            self._json(200, self._monitoring_summary())
            return
        if path == "/metrics":
            self._text(200, self._metrics_text())
            return

        status_match = STATUS_RE.match(path)
        if status_match:
            camera_id = int(status_match.group(1))
            self._json(200, self._camera_status(camera_id))
            return

        stream_match = STREAM_RE.match(path)
        if stream_match:
            self._stream_mjpeg(int(stream_match.group(1)))
            return

        self._json(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/cameras/start":
            self._start_camera()
            return
        if path == "/api/cameras/stop":
            self._stop_camera()
            return
        self._json(404, {"error": "Not found"})

    def _start_camera(self):
        payload = self._read_json()
        camera_id = int(payload["cameraId"])
        rtsp_url = payload["rtspUrl"]
        config = CameraWorkerConfig(
            camera_id=camera_id,
            rtsp_url=rtsp_url,
            model_path=str(self.server.model_path),
            conf=float(payload.get("conf", self.server.conf)),
            backend_url=payload.get("backendUrl", self.server.backend_url),
            username=payload.get("username", self.server.username),
            password=payload.get("password", self.server.password),
            minio_url=payload.get("minioUrl", self.server.minio_url),
            minio_access_key=payload.get("minioAccessKey", self.server.minio_access_key),
            minio_secret_key=payload.get("minioSecretKey", self.server.minio_secret_key),
            minio_bucket=payload.get("minioBucket", self.server.minio_bucket),
            alert_cooldown_seconds=float(payload.get("alertCooldownSeconds", self.server.alert_cooldown_seconds)),
            detection_interval_seconds=float(payload.get("detectionIntervalSeconds", self.server.detection_interval_seconds)),
            reconnect_delay_seconds=float(payload.get("reconnectDelaySeconds", self.server.reconnect_delay_seconds)),
            rtsp_transports=self.server.rtsp_transports,
            rtsp_buffer_size=self.server.rtsp_buffer_size,
            overlay_ttl_seconds=float(payload.get("overlayTtlSeconds", self.server.overlay_ttl_seconds)),
            sustained_detection_seconds=float(payload.get("sustainedDetectionSeconds", self.server.sustained_detection_seconds)),
        )
        with WORKERS_LOCK:
            old_worker = WORKERS.get(camera_id)
            if old_worker:
                STATUS_CACHE.pop(camera_id, None)
                self._json(200, old_worker.status())
                return
            source_entry = SOURCES.get(rtsp_url)
            if source_entry:
                source, ref_count = source_entry
                SOURCES[rtsp_url] = (source, ref_count + 1)
            else:
                source = SharedRtspSource(config)
                SOURCES[rtsp_url] = (source, 1)
                source.start()
            worker = CameraWorker(config, source, self.server.inference_scheduler)
            WORKERS[camera_id] = worker
            STATUS_CACHE.pop(camera_id, None)
        worker.start()
        self._json(200, {"cameraId": camera_id, "running": True})

    def _stop_camera(self):
        payload = self._read_json()
        camera_id = int(payload["cameraId"])
        source_to_stop = None
        with WORKERS_LOCK:
            worker = WORKERS.pop(camera_id, None)
            STATUS_CACHE.pop(camera_id, None)
            if worker:
                rtsp_url = worker.config.rtsp_url
                source, ref_count = SOURCES[rtsp_url]
                if ref_count <= 1:
                    source_to_stop = source
                    SOURCES.pop(rtsp_url)
                else:
                    SOURCES[rtsp_url] = (source, ref_count - 1)
        if worker:
            worker.stop()
        if source_to_stop:
            source_to_stop.stop()
        self._json(200, {"cameraId": camera_id, "running": False})

    def _stream_mjpeg(self, camera_id: int):
        self.send_response(200)
        self._cors_headers()
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        last_frame = None
        try:
            while True:
                worker = self._get_worker(camera_id)
                frame = worker.latest_jpeg() if worker else None
                if frame and frame != last_frame:
                    self.wfile.write(b"--frame\r\n")
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode())
                    self.wfile.write(frame)
                    self.wfile.write(b"\r\n")
                    self.wfile.flush()
                    last_frame = frame
                time.sleep(0.1)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _get_worker(self, camera_id: int) -> CameraWorker | None:
        with WORKERS_LOCK:
            return WORKERS.get(camera_id)

    def _camera_status(self, camera_id: int) -> dict:
        now = time.monotonic()
        cached = STATUS_CACHE.get(camera_id)
        if cached and now - cached[0] < STATUS_CACHE_TTL_SECONDS:
            return cached[1]
        worker = self._get_worker(camera_id)
        status = worker.status() if worker else {"cameraId": camera_id, "running": False, "error": None, "lastAlertAt": None, "hasFrame": False}
        STATUS_CACHE[camera_id] = (now, status)
        return status

    def _monitoring_summary(self) -> dict:
        with WORKERS_LOCK:
            workers = list(WORKERS.values())
            sources_total = len(SOURCES)
        return {
            "status": "UP",
            "workers": len(workers),
            "sources": sources_total,
            "inferenceScheduler": self.server.inference_scheduler.status(),
            "cameras": [worker.status() for worker in workers],
        }

    def _metrics_text(self) -> str:
        summary = self._monitoring_summary()
        lines = [
            "# HELP firesafe_ai_worker_up AI Worker service health",
            "# TYPE firesafe_ai_worker_up gauge",
            "firesafe_ai_worker_up 1",
            "# HELP firesafe_ai_workers_total Active AI camera workers",
            "# TYPE firesafe_ai_workers_total gauge",
            f"firesafe_ai_workers_total {summary['workers']}",
            "# HELP firesafe_ai_sources_total Active shared RTSP sources",
            "# TYPE firesafe_ai_sources_total gauge",
            f"firesafe_ai_sources_total {summary['sources']}",
        ]
        scheduler = summary["inferenceScheduler"]
        lines.extend([
            "# HELP firesafe_ai_scheduler_running AI inference scheduler running",
            "# TYPE firesafe_ai_scheduler_running gauge",
            f"firesafe_ai_scheduler_running {1 if scheduler.get('running') else 0}",
            "# HELP firesafe_ai_scheduler_registered_cameras Registered cameras in inference scheduler",
            "# TYPE firesafe_ai_scheduler_registered_cameras gauge",
            f"firesafe_ai_scheduler_registered_cameras {scheduler.get('registeredCameras', 0)}",
            "# HELP firesafe_ai_scheduler_batch_max_size Configured max inference batch size",
            "# TYPE firesafe_ai_scheduler_batch_max_size gauge",
            f"firesafe_ai_scheduler_batch_max_size {scheduler.get('batchMaxSize', 0)}",
            "# HELP firesafe_ai_scheduler_batches_total Total inference batches",
            "# TYPE firesafe_ai_scheduler_batches_total counter",
            f"firesafe_ai_scheduler_batches_total {scheduler.get('batchesTotal', 0)}",
            "# HELP firesafe_ai_scheduler_frames_inferred_total Total inferred frames",
            "# TYPE firesafe_ai_scheduler_frames_inferred_total counter",
            f"firesafe_ai_scheduler_frames_inferred_total {scheduler.get('framesInferredTotal', 0)}",
            "# HELP firesafe_ai_scheduler_batch_size_avg Average inference batch size",
            "# TYPE firesafe_ai_scheduler_batch_size_avg gauge",
            f"firesafe_ai_scheduler_batch_size_avg {scheduler.get('avgBatchSize', 0.0)}",
            "# HELP firesafe_ai_scheduler_inference_ms_avg Average scheduler batch inference time in ms",
            "# TYPE firesafe_ai_scheduler_inference_ms_avg gauge",
            f"firesafe_ai_scheduler_inference_ms_avg {scheduler.get('avgInferenceMs', 0.0)}",
            "# HELP firesafe_ai_scheduler_errors_total Total scheduler inference errors",
            "# TYPE firesafe_ai_scheduler_errors_total counter",
            f"firesafe_ai_scheduler_errors_total {scheduler.get('errorsTotal', 0)}",
        ])
        for camera in summary["cameras"]:
            camera_id = camera["cameraId"]
            labels = f'camera_id="{camera_id}"'
            lines.extend([
                f"firesafe_ai_camera_running{{{labels}}} {1 if camera.get('running') else 0}",
                f"firesafe_ai_camera_has_frame{{{labels}}} {1 if camera.get('hasFrame') else 0}",
                f"firesafe_ai_camera_error{{{labels}}} {1 if camera.get('error') else 0}",
                f"firesafe_ai_detections_total{{{labels}}} {camera.get('detectionsTotal', 0)}",
                f"firesafe_ai_alerts_sent_total{{{labels}}} {camera.get('alertsSentTotal', 0)}",
                f"firesafe_ai_inference_ms_avg{{{labels}}} {camera.get('inferenceMsAvg', 0.0)}",
            ])
        return "\n".join(lines) + "\n"

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _text(self, status: int, payload: str):
        body = payload.encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")


class AIWorkerServer(ThreadingHTTPServer):
    def __init__(self, server_address, handler_class, args):
        super().__init__(server_address, handler_class)
        self.model_path = Path(args.model)
        self.conf = args.conf
        self.backend_url = args.backend_url.rstrip("/")
        self.username = args.username
        self.password = args.password
        self.minio_url = args.minio_url
        self.minio_access_key = args.minio_access_key
        self.minio_secret_key = args.minio_secret_key
        self.minio_bucket = args.minio_bucket
        self.alert_cooldown_seconds = args.alert_cooldown_seconds
        self.detection_interval_seconds = args.detection_interval_seconds
        self.reconnect_delay_seconds = args.reconnect_delay_seconds
        self.rtsp_transports = args.rtsp_transports
        self.rtsp_buffer_size = args.rtsp_buffer_size
        self.overlay_ttl_seconds = args.overlay_ttl_seconds
        self.sustained_detection_seconds = args.sustained_detection_seconds
        self.inference_scheduler = InferenceScheduler(
            self.model_path,
            args.batch_max_size,
            args.batch_max_wait_ms,
            args.scheduler_idle_sleep_ms,
        )
        self.inference_scheduler.start()

    def server_close(self):
        self.inference_scheduler.stop()
        super().server_close()
