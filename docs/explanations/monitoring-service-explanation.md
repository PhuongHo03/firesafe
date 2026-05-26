# 📊 Monitoring Service — Giải thích Scraper/Aggregator

> Host-process nhẹ cho Giai đoạn 7. Service này scrape/export metrics từ Backend, AI Worker và infra rồi trả JSON cho Dashboard UI. Không dùng Grafana.

---

## 📁 Cấu trúc

```text
monitoring-service/
├── service.py              ← HTTP scraper/aggregator
├── requirements.txt        ← requests, redis, minio
└── venv/                   ← Generated local venv, không commit
```

---

## 🎯 Vai trò

Monitoring service tách riêng khỏi Backend/AI Worker để tránh nhồi logic polling infra vào service nghiệp vụ:

```text
Backend /actuator/prometheus + /api/v1/metrics/export ─┐
AI Worker /metrics                                      ├─> monitoring-service ─> Frontend Dashboard /
Redis / RabbitMQ / MinIO / host system                  ┘
```

Backend và AI Worker chỉ export metrics nhẹ. Monitoring service chịu trách nhiệm ping/scrape, degrade từng card nếu dependency down, rồi gom thành một response JSON cho UI.

---

## 🚀 Cách chạy

Runtime manager tự start service khi chạy:

```powershell
.\setup.ps1 up
```

```bash
./setup.sh up
```

Port thực tế xem trong:

```text
.runtime/ports.env
MONITORING_PORT=<port>
```

Log:

```text
.runtime/logs/monitoring-service.log
```

Mỗi log chỉ giữ 50 dòng cuối như các host process khác.

---

## 🔌 Endpoints

| Endpoint | Method | Mục đích |
|---|---|---|
| `/health` | GET | Health check `{ "status": "UP" }` |
| `/api/dashboard/metrics` | GET | JSON tổng hợp cho Dashboard UI |

---

## 📦 Data shape chính

```json
{
  "generatedAt": "...",
  "backend": {
    "status": "UP",
    "requestsTotal": 123,
    "errorRate": 0.0,
    "avgLatencyMs": 42,
    "uptimeSeconds": 3600
  },
  "aiWorker": {
    "status": "UP",
    "workers": 1,
    "sources": 1,
    "cameras": [{ "cameraId": 1, "running": true, "hasFrame": true }]
  },
  "system": {
    "cpuPct": 20,
    "ramUsedBytes": 123,
    "ramTotalBytes": 456,
    "diskUsedBytes": 1,
    "diskTotalBytes": 2,
    "gpu": { "available": false }
  },
  "infra": {
    "redis": { "status": "UP", "usedMemoryBytes": 123, "keyCount": 4 },
    "rabbitmq": { "status": "UP", "messages": 0, "consumers": 1 },
    "minio": { "status": "UP", "objectCount": 10, "bytes": 12345 }
  },
  "alerts": {
    "total": 123,
    "newCount": 4,
    "last24h": 12,
    "highConfidenceLast24h": 3,
    "hourly": [{ "hour": "14:00", "count": 2 }],
    "byLabel": [{ "label": "fire", "count": 8 }]
  },
  "cameras": { "total": 4, "active": 3 }
}
```

---

## ⚙️ Config

Runtime manager truyền các URL/port động:

| Argument | Default | Mô tả |
|---|---|---|
| `--host` | `127.0.0.1` | Bind host |
| `--port` | `8091` | HTTP port |
| `--backend-url` | `http://localhost:8080` | Backend base URL |
| `--ai-worker-url` | `http://localhost:8090` | AI Worker base URL |
| `--redis-host` | `localhost` | Redis host |
| `--redis-port` | `6379` | Redis port |
| `--rabbitmq-url` | `http://localhost:15672` | RabbitMQ management API URL |
| `--rabbitmq-username` | `guest` | RabbitMQ user |
| `--rabbitmq-password` | `guest` | RabbitMQ password |
| `--minio-url` | `localhost:9000` | MinIO API endpoint |
| `--minio-access-key` | `minioadmin` | MinIO access key |
| `--minio-secret-key` | `minioadmin` | MinIO secret key |
| `--minio-bucket` | `snapshots` | Snapshot bucket |
| `--timeout` | `2.0` | Timeout mỗi scrape |

---

## ✅ Degraded behavior

Nếu một dependency down, service vẫn trả `200` cho `/api/dashboard/metrics`; chỉ card tương ứng có `status: "DOWN"` và `error`. Dashboard vì vậy vẫn render phần còn lại thay vì trắng màn hình.

---

*Tài liệu phản ánh trạng thái `monitoring-service/` tại **Giai đoạn 7**. Monitoring là service riêng scrape metrics cho Dashboard UI, không dùng Grafana trong local MVP.*
