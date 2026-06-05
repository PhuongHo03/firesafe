# 🐳 Infrastructure & Docker Runtime — Giải thích

> Workflow chính Giai đoạn 9 là **Docker Compose full stack** qua `docker-compose.yml` + Nginx reverse proxy. Runtime manager/native dev scripts đã được loại bỏ để repo chỉ giữ một đường chạy chính.

---

## 🚀 Docker Compose full stack

Workflow hiện tại dùng `docker-compose.yml` để chạy full stack trong Docker:

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

Docker users chỉ cần root env:

```text
project-or-deploy-folder/
├── docker-compose.yml
└── .env
```

Compose đọc root `.env`, rồi inject biến vào container qua `environment:`/`build.args:`. Service dùng process env từ Compose; không còn service-local `.env.local` trong repo.

Flow env:

```text
root .env -> docker compose -> container env -> service
```

Frontend là ngoại lệ quan trọng: `NEXT_PUBLIC_*` được bake vào bundle lúc `docker build`, nên compose truyền các biến này qua `build.args`. Trong Docker Compose, các giá trị này để trống để browser gọi same-origin qua Nginx.

---

## 🌐 Nginx reverse proxy

Compose publish app qua Nginx tại `http://localhost:${NGINX_PORT}`. `frontend`, `backend`, `worker` và exporters chỉ `expose` trong Docker network. Prometheus publish qua local infra port mặc định `7005` để debug/ops nội bộ; browser app không gọi Prometheus trực tiếp mà gọi backend `/api/admin/metrics`.

| Public path | Upstream |
|---|---|
| `/` | `frontend:3000` |
| `/api/v1/` | `backend:8080` |
| `/api/admin/` | `backend:8080` |
| `/actuator/` | `backend:8080` |
| `/swagger-ui/`, `/swagger-ui.html`, `/v3/api-docs/` | `backend:8080` |

Route stream `GET /api/v1/cameras/{id}/stream.mjpg` vẫn đi qua backend nhưng có `location` riêng trong Nginx để tắt proxy buffering/cache và tăng timeout, tránh MJPEG stream bị stall. Nginx dùng Docker DNS resolver `127.0.0.11` với TTL ngắn để tránh lỗi 502 do giữ IP container cũ sau khi service bị recreate.

Worker và MinIO không còn có public proxy route. Browser gọi backend đã xác thực JWT; backend gọi worker qua `AI_WORKER_BASE_URL=http://worker:8090` và đọc MinIO bằng SDK nội bộ. Alert image được phục vụ qua `GET /api/v1/alerts/{id}/image`; Telegram notification cũng đọc object bằng MinIO SDK nội bộ và upload bytes lên Telegram.

Lưu ý production: Nginx là gateway network, không thay thế auth nghiệp vụ. Backend routes vẫn được Spring Security/JWT bảo vệ. Worker và MinIO nằm trong Docker network nội bộ; nếu cần expose trực tiếp để debug thì chỉ nên bind local hoặc bảo vệ bằng auth/network policy riêng.

---

## 📦 Docker Compose services

| Service | Image/build | Host port mặc định | Mục đích |
|---|---|---:|---|
| `nginx` | `nginx:1.27-alpine` | `3000` | App entrypoint + reverse proxy |
| `frontend` | `frontend/Dockerfile` | internal `3000` | Next.js UI |
| `backend` | `backend/Dockerfile` | internal `8080` | Spring Boot API |
| `worker` | `ai-worker/Dockerfile` | internal `8090` | AI Worker RTSP preview/detect |
| `adminer` | `adminer:4.8.1` | `7001` | DB UI |
| `minio` console | `minio/minio` | `7002` | MinIO UI |
| `redisinsight` | `redis/redisinsight` | `7003` | Redis UI |
| `rabbitmq` UI | `rabbitmq:3.13-management-alpine` | `7004` | RabbitMQ management UI |
| `prometheus` | `prom/prometheus` | `7005` | Scrape/store metrics + Prometheus UI/API |
| `mariadb` | `mariadb:11.4` | internal `3306` | DB chính |
| `minio` API | `minio/minio` | internal `9000` | Snapshot object storage |
| `redis` | `redis:7.4-alpine` | internal `6379` | Alert debounce, alert list cache, preview reservations, metrics cache |
| `rabbitmq` AMQP | `rabbitmq:3.13-management-alpine` | internal `5672` | Queue |
| `rabbitmq` Prometheus | `rabbitmq:3.13-management-alpine` | internal `15692` | RabbitMQ metrics endpoint |
| `redis-exporter` | `oliver006/redis_exporter` | internal `9121` | Redis metrics cho Prometheus |
| `mysqld-exporter` | `prom/mysqld-exporter` | internal `9104` | MariaDB metrics cho Prometheus |
| `node-exporter` | `prom/node-exporter` | internal `9100` | Host/container node metrics cho Prometheus |

`video-detect/` không nằm trong runtime compose: đây là CLI/debug tool chạy khi cần.

---

## 🔧 Root `.env`

Root `.env.example` là superset biến deploy cho tất cả service:

- bind/ports: `APP_BIND_ADDRESS=0.0.0.0` để máy cùng LAN truy cập app qua IP host, `INFRA_BIND_ADDRESS=127.0.0.1` để 5 UI infra chỉ nghe trên máy host, `NGINX_PORT` cho Nginx app entrypoint, infra UI ports `7001–7005`
- frontend public URL: `NEXT_PUBLIC_API_URL` (để trống để dùng same-origin Nginx)
- DB/RabbitMQ/MinIO creds; `RABBITMQ_NOTIFICATION_QUEUE_COUNT` quy định số queue shard cho job notification
- Redis/cache: `ALERT_LIST_CACHE_TTL_SECONDS` quy định TTL cache danh sách alerts; Redis runtime config nằm ở `infra/redis/redis.conf`
- Telegram: `TELEGRAM_ENABLED`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- runtime timezone: `TZ` mặc định `ICT-7` (UTC+7, container-safe) để tất cả containers dùng giờ Việt Nam
- backend auth: `JWT_SECRET`, `FIRESAFE_USERNAME`, `FIRESAFE_PASSWORD`
- preset camera seed: `FIRESAFE_PRESET_CAMERA_RTSP_URL`, `FIRESAFE_PRESET_CAMERA_NAME`, `FIRESAFE_PRESET_CAMERA_LOCATION`
- worker tuning: `AI_WORKER_CONF`, `AI_WORKER_RTSP_TRANSPORTS`, `AI_WORKER_RTSP_BUFFER_SIZE`, `AI_WORKER_OVERLAY_TTL_SECONDS`, `AI_WORKER_STATUS_CACHE_TTL_SECONDS`, `AI_WORKER_SUSTAINED_DETECTION_SECONDS`, `AI_WORKER_ALERT_LABELS`, `AI_WORKER_BATCH_MAX_SIZE`, `AI_WORKER_BATCH_MAX_WAIT_MS`, `AI_WORKER_SCHEDULER_IDLE_SLEEP_MS`, `AI_MODEL_URL`, `AI_MODEL_PATH`, `HF_TOKEN`
- capacity management: `PREVIEW_CPU_THRESHOLD`, `PREVIEW_TTL_SEC`, `PREVIEW_KEEPALIVE_SEC`, `DETECTION_CPU_THRESHOLD`, `DETECTION_GPU_THRESHOLD`
- Prometheus/exporters: `PROMETHEUS_PORT`; Prometheus scrape config nằm ở `infra/prometheus/prometheus.yml`, các exporter và RabbitMQ Prometheus endpoint chỉ expose nội bộ Docker

Không commit root `.env`; chỉ commit `.env.example`.

---

## 🤖 Worker model trong Docker

`worker` dùng model mặc định `best.pt`.

Docker entrypoint kiểm tra `AI_MODEL_PATH`:

1. Nếu `/app/models/best.pt` đã tồn tại trong volume `ai_worker_models` → dùng lại.
2. Nếu chưa có → tải từ `AI_MODEL_URL`:

```text
https://huggingface.co/TommyNgx/YOLOv10-Fire-and-Smoke-Detection/resolve/main/best.pt
```

Volume:

```yaml
ai_worker_models:/app/models
```

Service `worker` start được không cần RTSP/GPU. RTSP chỉ cần khi user bấm **Start Detect** camera thật. Docker image mặc định dùng PyTorch CPU-only để tránh kéo CUDA wheels nặng; GPU runtime là hướng tối ưu riêng sau shadow testing/benchmark thực tế.

Nếu Hugging Face repo/model yêu cầu auth, set `HF_TOKEN` trong root `.env`. Nếu đã có `/app/models/best.pt` trong volume `ai_worker_models`, worker dùng cache và không tải lại.

---

## 📊 Prometheus trong Docker

Docker Compose dùng Prometheus làm metrics collector/store. Prometheus đọc cấu hình tại `infra/prometheus/prometheus.yml`, scrape Backend `/actuator/prometheus`, AI Worker `/metrics`, Redis exporter, MariaDB exporter, RabbitMQ Prometheus endpoint, MinIO metrics endpoint và node-exporter.

Backend query Prometheus nội bộ qua internal URL `http://prometheus:9090/api/v1/query`, aggregate/normalize metrics và cache Redis snapshot TTL 10s. Frontend gọi `GET /api/admin/metrics` qua Nginx, không trực tiếp gọi Prometheus. Auto-refresh frontend default 15s.

Node-exporter chạy trong container với `pid: host` và mount `/proc`, `/sys`, `/` theo pattern production cho Linux native. Khi deploy trên Linux/Jetson, CPU/RAM/Disk phản ánh host Linux thật đang chạy Docker. Trên Docker Desktop Windows, các metrics này vẫn phản ánh Docker/WSL2 Linux VM, không phải Windows host thật. GPU chưa có exporter riêng nên Dashboard hiển thị `N/A` nếu không thêm DCGM/NVIDIA/Jetson exporter sau này.

---

## 🗂️ Volumes

```yaml
volumes:
  mariadb_data:        # DB data
  minio_data:          # Snapshot object storage
  redis_data:          # Redis AOF/data
  redisinsight_data:   # RedisInsight config
  ai_worker_models:    # Hugging Face best.pt cache
  prometheus_data:     # Prometheus TSDB retention 7 ngày
```

Data tồn tại sau restart/container recreate; mất khi chạy `docker compose down -v`.

Runtime config files mounted into infra containers:

| File | Mounted into | Mục đích |
|---|---|---|
| `infra/mariadb/mariadb.cnf` | MariaDB `/etc/mysql/conf.d/firesafe.cnf` | UTF8MB4, strict SQL mode, InnoDB sizing, slow query log |
| `infra/redis/redis.conf` | Redis `/usr/local/etc/redis/redis.conf` | AOF persistence, `/data`, `maxmemory 256mb`, `allkeys-lru` |
| `infra/rabbitmq/rabbitmq.conf` | RabbitMQ `/etc/rabbitmq/rabbitmq.conf` | Management/Prometheus ports, definitions import, resource limits |
| `infra/rabbitmq/definitions.json` | RabbitMQ `/etc/rabbitmq/definitions.json` | `alert.exchange`, notification queues/bindings, message TTL policy |
| `infra/rabbitmq/enabled_plugins` | RabbitMQ `/etc/rabbitmq/enabled_plugins` | Enable management + Prometheus plugins |

---

## ✅ Smoke checks

```powershell
docker compose config --quiet
docker compose up --build -d
Invoke-WebRequest http://localhost:3000/health -UseBasicParsing
Invoke-RestMethod http://localhost:3000/actuator/health
docker compose exec worker curl -f http://localhost:8090/health
Invoke-WebRequest http://localhost:7005/-/healthy -UseBasicParsing
```

```bash
docker compose config --quiet
docker compose up --build -d
curl http://localhost:3000/health
curl http://localhost:3000/actuator/health
docker compose exec worker curl -f http://localhost:8090/health
curl http://localhost:7005/-/healthy
```

App entrypoint local: `http://localhost:3000`.
App entrypoint LAN: `http://<IP-máy-host>:3000` khi `APP_BIND_ADDRESS=0.0.0.0` và firewall cho phép inbound TCP 3000. Các UI Adminer, MinIO Console, RedisInsight, RabbitMQ UI và Prometheus mặc định chỉ truy cập được từ chính máy host qua `INFRA_BIND_ADDRESS=127.0.0.1`; DB/Redis/RabbitMQ AMQP/MinIO API chỉ expose nội bộ Docker. Windows cần mở firewall bằng PowerShell Admin nếu máy khác trong LAN không truy cập được app:

```powershell
New-NetFirewallRule -DisplayName "FireSafe UI LAN TCP 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private
```

Adminer: `http://localhost:7001`.
MinIO Console: `http://localhost:7002`.
RedisInsight: `http://localhost:7003`.
RabbitMQ UI: `http://localhost:7004`.
Prometheus UI: `http://localhost:7005`.

---

## ⚠️ Chưa phải production hardening đầy đủ

Compose hiện tại phục vụ containerization/shadow testing và chưa phải production hardening đầy đủ. Chưa bao gồm:

- TLS/domain gateway production
- secrets manager
- backup/restore policy
- resource limits/SLO alert policy
- GPU runtime auto-config
- auth hardening bổ sung nếu cần expose worker/MinIO trực tiếp cho debug

---

*Tài liệu phản ánh trạng thái infrastructure tại **Giai đoạn 9**. Runtime chính dùng root `.env` + `docker-compose.yml` full stack; Nginx là app gateway cho frontend/backend, còn worker và MinIO nằm sau backend gateway nội bộ; Prometheus chạy qua local infra port và backend `/api/admin/metrics`; runtime manager/native dev scripts đã được loại bỏ.*
