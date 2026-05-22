import argparse
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from src.camera_worker import CameraWorker, CameraWorkerConfig
from src.config import DEFAULT_MODEL_PATH

WORKERS: dict[int, CameraWorker] = {}
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
        )
        with WORKERS_LOCK:
            old_worker = WORKERS.get(camera_id)
            if old_worker:
                self._json(200, old_worker.status())
                return
            worker = CameraWorker(config)
            WORKERS[camera_id] = worker
        worker.start()
        self._json(200, {"cameraId": camera_id, "running": True})

    def _stop_camera(self):
        payload = self._read_json()
        camera_id = int(payload["cameraId"])
        with WORKERS_LOCK:
            worker = WORKERS.pop(camera_id, None)
        if worker:
            worker.stop()
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


def parse_args():
    parser = argparse.ArgumentParser(description="FireSafe AI Worker HTTP service for RTSP preview and detection.")
    parser.add_argument("--host", default="127.0.0.1", help="Service bind host")
    parser.add_argument("--port", type=int, default=8090, help="Service port")
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH), help="Path to YOLO .pt model")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
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
    return parser.parse_args()


def main():
    args = parse_args()
    if not Path(args.model).exists():
        raise FileNotFoundError(f"Model not found: {args.model}")
    server = AIWorkerServer((args.host, args.port), AIWorkerHandler, args)
    print(f"FireSafe AI Worker service listening on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
