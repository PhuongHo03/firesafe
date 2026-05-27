import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import psutil
import requests
from minio import Minio
from redis import Redis


class MonitoringHandler(BaseHTTPRequestHandler):
    server_version = "FireSafeMonitoring/0.1"

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._json(200, {"status": "UP"})
            return
        if path == "/api/dashboard/metrics":
            self._json(200, self.server.collect())
            return
        self._json(404, {"error": "Not found"})

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
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}", flush=True)


class MonitoringServer(ThreadingHTTPServer):
    def __init__(self, server_address, handler_class, args):
        super().__init__(server_address, handler_class)
        self.backend_url = args.backend_url.rstrip("/")
        self.ai_worker_url = args.ai_worker_url.rstrip("/")
        self.redis_host = args.redis_host
        self.redis_port = args.redis_port
        self.rabbitmq_url = args.rabbitmq_url.rstrip("/")
        self.rabbitmq_username = args.rabbitmq_username
        self.rabbitmq_password = args.rabbitmq_password
        self.minio_url = args.minio_url
        self.minio_access_key = args.minio_access_key
        self.minio_secret_key = args.minio_secret_key
        self.minio_bucket = args.minio_bucket
        self.timeout = args.timeout

    def collect(self) -> dict:
        backend_business = self._backend_business_metrics()
        backend_prom = self._backend_prometheus_metrics()
        ai_metrics = self._ai_worker_metrics()
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "backend": backend_prom,
            "aiWorker": ai_metrics,
            "system": self._system_metrics(),
            "infra": {
                "redis": self._redis_metrics(),
                "rabbitmq": self._rabbitmq_metrics(),
                "minio": self._minio_metrics(),
            },
            "alerts": backend_business.get("alerts", self._empty_alerts()),
            "cameras": backend_business.get("cameras", {"total": 0, "active": 0}),
        }

    def _get_json(self, url: str) -> dict:
        response = requests.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _get_text(self, url: str) -> str:
        response = requests.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.text

    def _backend_business_metrics(self) -> dict:
        try:
            return self._get_json(f"{self.backend_url}/api/v1/metrics/export")
        except Exception as exc:
            return {"status": "DOWN", "error": str(exc)}

    def _backend_prometheus_metrics(self) -> dict:
        try:
            metrics = parse_prometheus_text(self._get_text(f"{self.backend_url}/actuator/prometheus"))
            request_count = sum(value for name, labels, value in metrics if name == "http_server_requests_seconds_count")
            request_sum = sum(value for name, labels, value in metrics if name == "http_server_requests_seconds_sum")
            error_count = sum(value for name, labels, value in metrics if name == "http_server_requests_seconds_count" and labels.get("status", "").startswith("5"))
            process_uptime = next((value for name, labels, value in metrics if name == "process_uptime_seconds"), 0.0)
            return {
                "status": "UP",
                "requestsTotal": request_count,
                "errorRate": error_count / request_count if request_count else 0.0,
                "avgLatencyMs": (request_sum / request_count * 1000) if request_count else 0.0,
                "uptimeSeconds": process_uptime,
            }
        except Exception as exc:
            return {"status": "DOWN", "requestsTotal": 0, "errorRate": 0, "avgLatencyMs": 0, "uptimeSeconds": 0, "error": str(exc)}

    def _ai_worker_metrics(self) -> dict:
        try:
            metrics = parse_prometheus_text(self._get_text(f"{self.ai_worker_url}/metrics"))
            workers = int(metric_value(metrics, "firesafe_ai_workers_total"))
            sources = int(metric_value(metrics, "firesafe_ai_sources_total"))
            cameras: dict[str, dict] = {}
            for name, labels, value in metrics:
                camera_id = labels.get("camera_id")
                if not camera_id:
                    continue
                camera = cameras.setdefault(camera_id, {"cameraId": int(camera_id)})
                if name == "firesafe_ai_camera_running":
                    camera["running"] = value == 1
                elif name == "firesafe_ai_camera_has_frame":
                    camera["hasFrame"] = value == 1
                elif name == "firesafe_ai_camera_error":
                    camera["hasError"] = value == 1
                elif name == "firesafe_ai_detections_total":
                    camera["detectionsTotal"] = int(value)
                elif name == "firesafe_ai_alerts_sent_total":
                    camera["alertsSentTotal"] = int(value)
                elif name == "firesafe_ai_inference_ms_avg":
                    camera["inferenceMsAvg"] = value
            return {"status": "UP", "workers": workers, "sources": sources, "cameras": list(cameras.values())}
        except Exception as exc:
            return {"status": "DOWN", "workers": 0, "sources": 0, "cameras": [], "error": str(exc)}

    def _redis_metrics(self) -> dict:
        try:
            client = Redis(host=self.redis_host, port=self.redis_port, socket_timeout=self.timeout, decode_responses=True)
            client.ping()
            info = client.info()
            key_count = sum(db.get("keys", 0) for name, db in info.items() if name.startswith("db") and isinstance(db, dict))
            return {"status": "UP", "usedMemoryBytes": info.get("used_memory", 0), "keyCount": key_count}
        except Exception as exc:
            return {"status": "DOWN", "usedMemoryBytes": 0, "keyCount": 0, "error": str(exc)}

    def _rabbitmq_metrics(self) -> dict:
        try:
            response = requests.get(
                f"{self.rabbitmq_url}/api/queues",
                auth=(self.rabbitmq_username, self.rabbitmq_password),
                timeout=self.timeout,
            )
            response.raise_for_status()
            queues = response.json()
            messages = sum(queue.get("messages", 0) for queue in queues)
            consumers = sum(queue.get("consumers", 0) for queue in queues)
            return {"status": "UP", "messages": messages, "consumers": consumers}
        except Exception as exc:
            return {"status": "DOWN", "messages": 0, "consumers": 0, "error": str(exc)}

    def _minio_metrics(self) -> dict:
        try:
            client = Minio(self.minio_url, access_key=self.minio_access_key, secret_key=self.minio_secret_key, secure=False)
            count = 0
            total_bytes = 0
            for item in client.list_objects(self.minio_bucket, recursive=True):
                count += 1
                total_bytes += item.size or 0
            return {"status": "UP", "objectCount": count, "bytes": total_bytes}
        except Exception as exc:
            return {"status": "DOWN", "objectCount": 0, "bytes": 0, "error": str(exc)}

    def _system_metrics(self) -> dict:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage(system_root_path())
        return {
            "cpuPct": cpu_percent(),
            "ramUsedBytes": memory.used,
            "ramTotalBytes": memory.total,
            "diskUsedBytes": disk.used,
            "diskTotalBytes": disk.total,
            "gpu": gpu_metrics(),
        }

    def _empty_alerts(self) -> dict:
        return {"total": 0, "newCount": 0, "last24h": 0, "highConfidenceLast24h": 0, "byLabel": [], "hourly": []}


def parse_prometheus_text(text: str) -> list[tuple[str, dict[str, str], float]]:
    metrics = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        metric, value_text = line.rsplit(" ", 1)
        labels = {}
        name = metric
        if "{" in metric and metric.endswith("}"):
            name, label_text = metric.split("{", 1)
            labels = parse_labels(label_text[:-1])
        try:
            metrics.append((name, labels, float(value_text)))
        except ValueError:
            continue
    return metrics


def parse_labels(label_text: str) -> dict[str, str]:
    labels = {}
    for item in label_text.split(","):
        if "=" not in item:
            continue
        key, value = item.split("=", 1)
        labels[key] = value.strip('"')
    return labels


def metric_value(metrics: list[tuple[str, dict[str, str], float]], name: str) -> float:
    return next((value for metric_name, labels, value in metrics if metric_name == name), 0.0)


def cpu_percent() -> float:
    return psutil.cpu_percent(interval=0.1)


def system_root_path() -> str:
    drive, _ = os.path.splitdrive(os.getcwd())
    return f"{drive}\\" if drive else "/"


def gpu_metrics() -> dict:
    try:
        output = subprocess.check_output(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"], text=True, timeout=2)
        first = output.splitlines()[0]
        util, used, total = [int(item.strip()) for item in first.split(",")]
        return {"available": True, "utilPct": util, "memoryUsedBytes": used * 1024 * 1024, "memoryTotalBytes": total * 1024 * 1024}
    except Exception:
        return {"available": False}


def parse_args():
    parser = argparse.ArgumentParser(description="FireSafe monitoring scraper service.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8091)
    parser.add_argument("--backend-url", default=os.getenv("BACKEND_URL", "http://localhost:8080"))
    parser.add_argument("--ai-worker-url", default=os.getenv("AI_WORKER_URL", "http://localhost:8090"))
    parser.add_argument("--redis-host", default=os.getenv("REDIS_HOST", "localhost"))
    parser.add_argument("--redis-port", type=int, default=int(os.getenv("REDIS_PORT", "6379")))
    parser.add_argument("--rabbitmq-url", default=os.getenv("RABBITMQ_URL", "http://localhost:15672"))
    parser.add_argument("--rabbitmq-username", default=os.getenv("RABBITMQ_USERNAME", "guest"))
    parser.add_argument("--rabbitmq-password", default=os.getenv("RABBITMQ_PASSWORD", "guest"))
    parser.add_argument("--minio-url", default=os.getenv("MINIO_URL", "localhost:9000"))
    parser.add_argument("--minio-access-key", default=os.getenv("MINIO_ACCESS_KEY", "minioadmin"))
    parser.add_argument("--minio-secret-key", default=os.getenv("MINIO_SECRET_KEY", "minioadmin"))
    parser.add_argument("--minio-bucket", default=os.getenv("MINIO_BUCKET", "snapshots"))
    parser.add_argument("--timeout", type=float, default=2.0)
    return parser.parse_args()


def main():
    args = parse_args()
    server = MonitoringServer((args.host, args.port), MonitoringHandler, args)
    print(f"FireSafe Monitoring service listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
