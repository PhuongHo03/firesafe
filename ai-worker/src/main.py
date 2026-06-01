import argparse
import os

from src.configs.config import AI_WORKER_ROOT, DEFAULT_MODEL_PATH, resolve_model_path


def parse_rtsp_transports(value: str) -> list[str]:
    transports = [item.strip().lower() for item in value.split(",") if item.strip()]
    allowed = {"default", "udp", "tcp"}
    invalid = [item for item in transports if item not in allowed]
    if invalid:
        raise ValueError(f"Invalid RTSP transport(s): {', '.join(invalid)}")
    return transports or ["default", "udp", "tcp"]


def parse_args():
    parser = argparse.ArgumentParser(description="FireSafe AI Worker HTTP service for RTSP preview and detection.")
    parser.add_argument("--host", default="127.0.0.1", help="Service bind host")
    parser.add_argument("--port", type=int, default=8090, help="Service port")
    parser.add_argument(
        "--model",
        help=f"Path to YOLO .pt model (default: {DEFAULT_MODEL_PATH})",
    )
    parser.add_argument("--conf", type=float, default=float(os.getenv("AI_WORKER_CONF", "0.25")), help="Confidence threshold")
    parser.add_argument("--backend-url", default=os.getenv("BACKEND_URL", "http://localhost:8080"), help="Backend API base URL")
    parser.add_argument("--username", default=os.getenv("FIRESAFE_USERNAME", "admin@nhattienchung.vn"), help="Backend login email")
    parser.add_argument("--password", default=os.getenv("FIRESAFE_PASSWORD", "admin123"), help="Backend login password")
    parser.add_argument("--minio-url", default=os.getenv("MINIO_URL", "localhost:9000"), help="MinIO host:port")
    parser.add_argument("--minio-access-key", default=os.getenv("MINIO_ACCESS_KEY", "minioadmin"), help="MinIO access key")
    parser.add_argument("--minio-secret-key", default=os.getenv("MINIO_SECRET_KEY", "minioadmin"), help="MinIO secret key")
    parser.add_argument("--minio-bucket", default=os.getenv("MINIO_BUCKET", "snapshots"), help="MinIO bucket")
    parser.add_argument("--alert-cooldown-seconds", type=float, default=30.0, help="Minimum seconds between alerts")
    parser.add_argument("--detection-interval-seconds", type=float, default=1.0, help="Seconds between YOLO inference runs")
    parser.add_argument("--reconnect-delay-seconds", type=float, default=5.0, help="Seconds before reconnecting RTSP")
    parser.add_argument("--rtsp-transports", default=os.getenv("AI_WORKER_RTSP_TRANSPORTS", "default,udp,tcp"), help="Comma-separated RTSP transport fallback order: default, udp, tcp")
    parser.add_argument("--rtsp-buffer-size", type=int, default=int(os.getenv("AI_WORKER_RTSP_BUFFER_SIZE", "1")), help="OpenCV RTSP buffer size; 0 disables setting it")
    parser.add_argument("--overlay-ttl-seconds", type=float, default=float(os.getenv("AI_WORKER_OVERLAY_TTL_SECONDS", "2.0")), help="Seconds to keep drawing latest detections on live preview")
    parser.add_argument("--sustained-detection-seconds", type=float, default=float(os.getenv("AI_WORKER_SUSTAINED_DETECTION_SECONDS", "3.0")), help="Seconds detection must persist before sending an alert")
    parser.add_argument("--batch-max-size", type=int, default=int(os.getenv("AI_WORKER_BATCH_MAX_SIZE", "1")), help="Max cross-camera inference batch size")
    parser.add_argument("--batch-max-wait-ms", type=float, default=float(os.getenv("AI_WORKER_BATCH_MAX_WAIT_MS", "50")), help="Max milliseconds to wait before running a partial inference batch")
    parser.add_argument("--scheduler-idle-sleep-ms", type=float, default=float(os.getenv("AI_WORKER_SCHEDULER_IDLE_SLEEP_MS", "5")), help="Scheduler idle sleep in milliseconds")
    args = parser.parse_args()
    args.rtsp_transports = parse_rtsp_transports(args.rtsp_transports)
    return args


def main():
    args = parse_args()

    from src.controllers.ai_worker_controller import AIWorkerHandler, AIWorkerServer
    from src.services.detector import validate_model_path

    model_path = resolve_model_path(args.model)
    validate_model_path(model_path)
    args.model = str(model_path)
    server = AIWorkerServer((args.host, args.port), AIWorkerHandler, args)
    print(f"FireSafe AI Worker service listening on http://{args.host}:{args.port}", flush=True)
    print(f"Using model: {model_path}", flush=True)
    print(f"RTSP transports: {', '.join(args.rtsp_transports)}; buffer size: {args.rtsp_buffer_size}", flush=True)
    print(f"Inference batch max size: {args.batch_max_size}; max wait: {args.batch_max_wait_ms}ms", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
