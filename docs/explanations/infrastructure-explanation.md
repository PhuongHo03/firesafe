# 🐳 Infrastructure & Docker Runtime — Giải thích

> Workflow chính Giai đoạn 9 là **Docker Compose full stack** qua `docker-compose.yml` + Nginx reverse proxy. Runtime manager/native dev scripts đã được loại bỏ để repo chỉ giữ một đường chạy chính.

---

## 🚀 Docker Compose full stack

Giai đoạn 8 dùng `docker-compose.yml` để chạy full stack trong Docker:

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

Compose publish app qua Nginx tại `http://localhost:${FRONTEND_PORT}`. `frontend`, `backend`, `worker`, `prometheus` và exporters chỉ `expose` trong Docker network, trừ các UI/dev ports được khai báo rõ.

| Public path | Upstream |
|---|---|
| `/` | `frontend:3000` |
| `/api/v1/` | `backend:8080` |
| `/actuator/` | `backend:8080` |
| `/swagger-ui/`, `/swagger-ui.html`, `/v3/api-docs/` | `backend:8080` |
| `/api/cameras/` | `worker:8090` |
| `/worker/health` | `worker:8090/health` |
| `/prometheus/api/v1/query` | `prometheus:9090/api/v1/query` |
| `/prometheus/-/healthy` | `prometheus:9090/-/healthy` |
| `/health` | Nginx local health |

`/api/cameras/` tắt proxy buffering/cache và tăng timeout để MJPEG stream không bị stall. Nginx dùng Docker DNS resolver `127.0.0.11` với TTL ngắn để tránh lỗi 502 do giữ IP container cũ sau khi `worker`/service bị recreate.

---

## 📦 Docker Compose services

| Service | Image/build | Host port mặc định | Mục đích |
|---|---|---:|---|
| `nginx` | `nginx:1.27-alpine` | `3000` | App entrypoint + reverse proxy |
| `frontend` | `frontend/Dockerfile` | internal `3000` | Next.js UI |
| `backend` | `backend/Dockerfile` | internal `8080` | Spring Boot API |
| `worker` | `ai-worker/Dockerfile` | internal `8090` | AI Worker RTSP preview/detect |
| `prometheus` | `prom/prometheus` | `7009` | Scrape/store metrics + Prometheus HTTP API |
| `adminer` | `adminer:4.8.1` | `7001` | DB UI |
| `minio` console | `minio/minio` | `7002` | MinIO UI |
| `redisinsight` | `redis/redisinsight` | `7003` | Redis UI |
| `rabbitmq` UI | `rabbitmq:3.13-management-alpine` | `7004` | RabbitMQ management UI |
| `mariadb` | `mariadb:11.4` | `7005` | DB chính |
| `minio` API | `minio/minio` | `7006` | Snapshot object storage |
| `redis` | `redis:7.4-alpine` | `7007` | Debounce/cache |
| `rabbitmq` AMQP | `rabbitmq:3.13-management-alpine` | `7008` | Queue |
| `rabbitmq` Prometheus | `rabbitmq:3.13-management-alpine` | `7010` | RabbitMQ metrics endpoint |
| `redis-exporter` | `oliver006/redis_exporter` | internal `9121` | Redis metrics cho Prometheus |
| `mysqld-exporter` | `prom/mysqld-exporter` | internal `9104` | MariaDB metrics cho Prometheus |
| `node-exporter` | `prom/node-exporter` | internal `9100` | Host/container node metrics cho Prometheus |

`video-detect/` không nằm trong runtime compose: đây là CLI/debug tool chạy khi cần.

---

## 🔧 Root `.env`

Root `.env.example` là superset biến deploy cho tất cả service:

- public bind/ports: `APP_BIND_ADDRESS=0.0.0.0` để máy cùng LAN truy cập app qua IP host, `FRONTEND_PORT` cho Nginx app entrypoint, infra ports `7001–7010`
- frontend public URLs: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_WORKER_URL`, `NEXT_PUBLIC_PROMETHEUS_URL` (để trống để dùng same-origin Nginx)
- DB/RabbitMQ/MinIO creds
- runtime timezone: `TZ` mặc định `ICT-7` (UTC+7, container-safe) để tất cả containers dùng giờ Việt Nam
- backend auth: `JWT_SECRET`, `FIRESAFE_USERNAME`, `FIRESAFE_PASSWORD`
- preset camera seed: `FIRESAFE_PRESET_CAMERA_RTSP_URL`, `FIRESAFE_PRESET_CAMERA_NAME`, `FIRESAFE_PRESET_CAMERA_LOCATION`
- worker tuning: `AI_WORKER_CONF`, `AI_WORKER_RTSP_TRANSPORTS`, `AI_WORKER_RTSP_BUFFER_SIZE`, `AI_WORKER_OVERLAY_TTL_SECONDS`, `AI_WORKER_STATUS_CACHE_TTL_SECONDS`, `AI_WORKER_SUSTAINED_DETECTION_SECONDS`, `AI_WORKER_BATCH_MAX_SIZE`, `AI_WORKER_BATCH_MAX_WAIT_MS`, `AI_WORKER_SCHEDULER_IDLE_SLEEP_MS`, `AI_MODEL_URL`, `AI_MODEL_PATH`, `HF_TOKEN`
- Prometheus/exporters: `PROMETHEUS_PORT`, `RABBITMQ_PROMETHEUS_PORT`; Prometheus scrape config nằm ở `infra/prometheus/prometheus.yml`

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

Service `worker` start được không cần RTSP/GPU. RTSP chỉ cần khi user bấm **Start Detect** camera thật. Docker image mặc định dùng PyTorch CPU-only để tránh kéo CUDA wheels nặng; GPU runtime là hướng tối ưu riêng sau Phase 8.

Nếu Hugging Face repo/model yêu cầu auth, set `HF_TOKEN` trong root `.env`. Nếu đã có `/app/models/best.pt` trong volume `ai_worker_models`, worker dùng cache và không tải lại.

---

## 📊 Prometheus trong Docker

Docker Compose dùng Prometheus làm metrics collector/store. Prometheus đọc cấu hình tại `infra/prometheus/prometheus.yml`, scrape Backend `/actuator/prometheus`, AI Worker `/metrics`, Redis exporter, MariaDB exporter, RabbitMQ Prometheus endpoint, MinIO metrics endpoint và node-exporter.

Nginx chỉ proxy các endpoint Prometheus cần cho frontend:

```text
/prometheus/api/v1/query
/prometheus/-/healthy
```

Frontend tự query Prometheus API qua Nginx và map kết quả về shape Dashboard UI. Không còn `monitoring-service` hay `/api/dashboard/metrics` aggregator riêng.

Node-exporter chạy trong container và phản ánh Linux VM/container context trên Docker Desktop Windows, không bảo đảm đúng Windows host thật. GPU chưa có exporter riêng nên Dashboard hiển thị `N/A` nếu không thêm DCGM/NVIDIA exporter sau này.

---

## 🗂️ Volumes

```yaml
volumes:
  mariadb_data:        # DB data
  minio_data:          # Snapshot object storage
  redisinsight_data:   # RedisInsight config
  ai_worker_models:    # Hugging Face best.pt cache
```

Data tồn tại sau restart/container recreate; mất khi chạy `docker compose down -v`.

---

## ✅ Smoke checks

```powershell
docker compose config --quiet
docker compose up --build -d
Invoke-WebRequest http://localhost:3000/health -UseBasicParsing
Invoke-RestMethod http://localhost:3000/actuator/health
Invoke-RestMethod http://localhost:3000/worker/health
Invoke-RestMethod http://localhost:3000/prometheus/-/healthy
Invoke-RestMethod "http://localhost:3000/prometheus/api/v1/query?query=up"
```

```bash
docker compose config --quiet
docker compose up --build -d
curl http://localhost:3000/health
curl http://localhost:3000/actuator/health
curl http://localhost:3000/worker/health
curl http://localhost:3000/prometheus/-/healthy
curl "http://localhost:3000/prometheus/api/v1/query?query=up"
```

App entrypoint local: `http://localhost:3000`.
App entrypoint LAN: `http://<IP-máy-host>:3000` khi `APP_BIND_ADDRESS=0.0.0.0` và firewall cho phép inbound TCP 3000. Windows cần mở firewall bằng PowerShell Admin nếu máy khác trong LAN không truy cập được:

```powershell
New-NetFirewallRule -DisplayName "FireSafe UI LAN TCP 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private
```

Adminer: `http://localhost:7001`.
MinIO Console: `http://localhost:7002`.
RedisInsight: `http://localhost:7003`.
RabbitMQ UI: `http://localhost:7004`.
MariaDB: `localhost:7005`.
MinIO API: `http://localhost:7006`.
Redis: `localhost:7007`.
RabbitMQ AMQP: `localhost:7008`.

---

## ⚠️ Chưa phải production hardening đầy đủ

Compose Phase 8 phục vụ containerization/shadow testing. Chưa bao gồm:

- TLS/domain gateway production
- secrets manager
- backup/restore policy
- resource limits/SLO alert policy
- GPU runtime auto-config

---

*Tài liệu phản ánh trạng thái infrastructure tại **Giai đoạn 9**. Runtime chính dùng root `.env` + `docker-compose.yml` full stack; runtime manager/native dev scripts đã được loại bỏ.*
