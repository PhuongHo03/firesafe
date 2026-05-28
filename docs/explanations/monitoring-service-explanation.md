# 📊 Monitoring Service — Giải thích Scraper/Aggregator

> Scraper/aggregator nhẹ cho Dashboard UI. Service này chạy được cả native host-process và Docker Compose Phase 8.

---

## 📁 Cấu trúc

```text
monitoring-service/
├── service.py              ← HTTP scraper/aggregator
├── Dockerfile              ← Container image cho Docker Compose
├── requirements.txt        ← requests, redis, minio, psutil
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

Backend và AI Worker chỉ export metrics nhẹ. Monitoring service chịu trách nhiệm ping/scrape, degrade từng card nếu dependency down, rồi gom thành một response JSON cho UI. Trong Docker Compose, Dashboard gọi endpoint này qua Nginx tại `/api/dashboard/metrics`. Response được cache ngắn trong Redis mặc định 2 giây để nhiều dashboard/browser không scrape toàn bộ dependency liên tục nhưng vẫn đủ gần realtime cho UI và cơ chế chặn mở thêm camera preview khi hệ thống gần quá tải.

System metrics dùng `psutil` (`cpu_percent(interval=0.1)`, `virtual_memory`, `disk_usage`); GPU dùng `nvidia-smi` nếu máy có NVIDIA driver/tool trong PATH, nếu không thì Dashboard hiển thị `N/A`. Khi chạy native qua runtime manager, CPU/RAM/Disk là máy host thật. Khi chạy Docker Compose trên Linux, container được mount `/proc`, `/sys`, `/` vào `/host/*` và set `HOST_PROC`, `HOST_SYS`, `HOST_ROOT` để đọc host Linux thật. Trên Docker Desktop Windows, container chạy trong Linux VM nên không bảo đảm phản ánh Windows host thật.

---

## 🚀 Cách chạy

### Docker Compose full stack — workflow chính Giai đoạn 8

```powershell
Copy-Item .env.example .env
# chỉnh .env nếu cần
docker compose up --build -d
```

```bash
cp .env.example .env
# chỉnh .env nếu cần
docker compose up --build -d
```

Trong Compose, `monitoring-service` chạy nội bộ tại `monitoring-service:8091`, không publish trực tiếp ra host. Browser gọi qua Nginx:

```text
http://localhost:<FRONTEND_PORT>/api/dashboard/metrics
http://localhost:<FRONTEND_PORT>/monitoring/health
```

Mặc định:

```text
http://localhost:3000/api/dashboard/metrics
http://localhost:3000/monitoring/health
```

### Native dev runtime

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

Runtime manager truyền các URL/port động; Docker Compose truyền cùng các giá trị qua root `.env`/`environment`:

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
| `--cache-ttl-seconds` | `MONITORING_CACHE_TTL_SECONDS`, fallback `2` | TTL cache Redis cho `/api/dashboard/metrics` |
| `HOST_PROC` | Không | Docker Linux host proc mount, ví dụ `/host/proc` |
| `HOST_SYS` | Không | Docker Linux host sys mount, ví dụ `/host/sys` |
| `HOST_ROOT` | Không | Docker Linux host root mount, ví dụ `/host/root` |

---

## ✅ Degraded behavior

Nếu một dependency down, service vẫn trả `200` cho `/api/dashboard/metrics`; chỉ card tương ứng có `status: "DOWN"` và `error`. Dashboard vì vậy vẫn render phần còn lại thay vì trắng màn hình.

---

*Tài liệu phản ánh trạng thái `monitoring-service/` tại **Giai đoạn 8**. Monitoring là service riêng scrape metrics cho Dashboard UI, chạy được native host-process hoặc Docker Compose với Linux host metrics mount; không dùng Grafana trong local MVP.*
