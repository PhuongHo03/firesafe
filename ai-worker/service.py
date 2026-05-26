import argparse
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from src.camera_worker import CameraWorker, CameraWorkerConfig, SharedRtspSource
from src.config import AI_WORKER_ROOT, DEFAULT_MODEL_PATH, FALLBACK_MODEL_PATH, resolve_model_path
from src.detector import validate_model_path

WORKERS: dict[int, CameraWorker] = {}
SOURCES: dict[str, tuple[SharedRtspSource, int]] = {}
WORKERS_LOCK = threading.Lock()
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
            worker = self._get_worker(camera_id)
            self._json(200, worker.status() if worker else {"cameraId": camera_id, "running": False, "error": None, "lastAlertAt": None, "hasFrame": False})
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
            worker = CameraWorker(config, source)
            WORKERS[camera_id] = worker
        worker.start()
        self._json(200, {"cameraId": camera_id, "running": True})

    def _stop_camera(self):
        payload = self._read_json()
        camera_id = int(payload["cameraId"])
        source_to_stop = None
        with WORKERS_LOCK:
            worker = WORKERS.pop(camera_id, None)
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

    def _monitoring_summary(self) -> dict:
        with WORKERS_LOCK:
            workers = list(WORKERS.values())
            sources_total = len(SOURCES)
        return {
            "status": "UP",
            "workers": len(workers),
            "sources": sources_total,
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


def load_env_file():
    env_file = AI_WORKER_ROOT / ".env.local"
    if not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        if name:
            os.environ.setdefault(name, value)


def parse_rtsp_transports(value: str) -> list[str]:
    transports = [item.strip().lower() for item in value.split(",") if item.strip()]
    allowed = {"default", "udp", "tcp"}
    invalid = [item for item in transports if item not in allowed]
    if invalid:
        raise ValueError(f"Invalid RTSP transport(s): {', '.join(invalid)}")
    return transports or ["default", "udp", "tcp"]


def parse_args():
    load_env_file()
    parser = argparse.ArgumentParser(description="FireSafe AI Worker HTTP service for RTSP preview and detection.")
    parser.add_argument("--host", default="127.0.0.1", help="Service bind host")
    parser.add_argument("--port", type=int, default=8090, help="Service port")
    parser.add_argument(
        "--model",
        help=f"Path to YOLO .pt model (default: {DEFAULT_MODEL_PATH}, fallback: {FALLBACK_MODEL_PATH})",
    )
    parser.add_argument("--conf", type=float, default=float(os.getenv("AI_WORKER_CONF", "0.25")), help="Confidence threshold")
    parser.add_argument("--backend-url", default=os.getenv("BACKEND_URL", "http://localhost:8080"), help="Backend API base URL")
    parser.add_argument("--username", default="admin", help="Backend login username")
    parser.add_argument("--password", default="admin123", help="Backend login password")
    parser.add_argument("--minio-url", default=os.getenv("MINIO_URL", "localhost:9000"), help="MinIO host:port")
    parser.add_argument("--minio-access-key", default="minioadmin", help="MinIO access key")
    parser.add_argument("--minio-secret-key", default="minioadmin", help="MinIO secret key")
    parser.add_argument("--minio-bucket", default="snapshots", help="MinIO bucket")
    parser.add_argument("--alert-cooldown-seconds", type=float, default=30.0, help="Minimum seconds between alerts")
    parser.add_argument("--detection-interval-seconds", type=float, default=1.0, help="Seconds between YOLO inference runs")
    parser.add_argument("--reconnect-delay-seconds", type=float, default=5.0, help="Seconds before reconnecting RTSP")
    parser.add_argument("--rtsp-transports", default=os.getenv("AI_WORKER_RTSP_TRANSPORTS", "default,udp,tcp"), help="Comma-separated RTSP transport fallback order: default, udp, tcp")
    parser.add_argument("--rtsp-buffer-size", type=int, default=int(os.getenv("AI_WORKER_RTSP_BUFFER_SIZE", "1")), help="OpenCV RTSP buffer size; 0 disables setting it")
    parser.add_argument("--overlay-ttl-seconds", type=float, default=float(os.getenv("AI_WORKER_OVERLAY_TTL_SECONDS", "2.0")), help="Seconds to keep drawing latest detections on live preview")
    parser.add_argument("--sustained-detection-seconds", type=float, default=float(os.getenv("AI_WORKER_SUSTAINED_DETECTION_SECONDS", "3.0")), help="Seconds detection must persist before sending an alert")
    args = parser.parse_args()
    args.rtsp_transports = parse_rtsp_transports(args.rtsp_transports)
    return args


def main():
    args = parse_args()
    model_path = resolve_model_path(args.model)
    validate_model_path(model_path)
    args.model = str(model_path)
    server = AIWorkerServer((args.host, args.port), AIWorkerHandler, args)
    print(f"FireSafe AI Worker service listening on http://{args.host}:{args.port}", flush=True)
    print(f"Using model: {model_path}", flush=True)
    print(f"RTSP transports: {', '.join(args.rtsp_transports)}; buffer size: {args.rtsp_buffer_size}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
