# 🐳 Infrastructure & Docker Runtime — Giải thích

> Workflow chính Giai đoạn 8 là **Docker Compose full stack** qua `docker-compose.yml` + Nginx reverse proxy. **Native dev** qua `setup.ps1`/`setup.sh` vẫn giữ để debug host-process nhanh.

---

## 🚀 Chế độ 1 — Docker Compose full stack

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

Compose đọc root `.env`, rồi inject biến vào container qua `environment:`/`build.args:`. Service không cần đọc `.env.local` trong container.

Flow env:

```text
Native dev: service/.env.local -> setup script -> process env -> service
Docker:     root .env          -> docker compose -> container env -> service
```

Frontend là ngoại lệ quan trọng: `NEXT_PUBLIC_*` được bake vào bundle lúc `docker build`, nên compose truyền các biến này qua `build.args`. Trong Docker Compose, các giá trị này để trống để browser gọi same-origin qua Nginx.

---

## 🚀 Chế độ 2 — Native dev runtime

Runtime manager giữ workflow dev nhanh: app service chạy trên host, infra chạy Docker.

Windows:

```powershell
.\setup.ps1 up
.\setup.ps1 down
.\setup.ps1 clean
```

Linux:

```bash
./setup.sh up
./setup.sh down
./setup.sh clean
```

| Command | Hành động |
|---|---|
| `up` | Tạo `.runtime/`, kiểm tra dependency, tự chuẩn bị JDK/frontend deps/AI Worker/monitoring venv khi cần, ghi `frontend/.env.local`, start Docker infra + backend + worker + monitoring + frontend |
| `down` | Dừng host-process bằng PID metadata, `docker compose -f docker-compose.dev.yml down`, xóa `.runtime/`; giữ deps/build cache |
| `clean` | Làm toàn bộ việc của `down`, xóa Docker volume/orphan thuộc project và generated artifacts local |

Native dev dùng service-local env nếu có:

```text
backend/.env.local
frontend/.env.local
ai-worker/.env.local
```

`setup.ps1`/`setup.sh` nạp các file này hoặc tự ghi env cần thiết rồi truyền vào process. App code vẫn đọc **process env**, không hardcode đường dẫn env file.

Runtime metadata/logs:

```text
.runtime/ports.env
.runtime/logs/docker.log
.runtime/logs/backend.log
.runtime/logs/frontend.log
.runtime/logs/ai-worker.log
.runtime/logs/monitoring-service.log
```

`ports.env` chứa port host thực tế cho frontend/backend/worker/monitoring và infra. Runtime manager ưu tiên port mặc định rồi tự tăng nếu port bận.

---

## 🌐 Nginx reverse proxy

Compose chỉ publish app qua Nginx tại `http://localhost:${FRONTEND_PORT}`. `frontend`, `backend`, `worker`, `monitoring-service` chỉ `expose` trong Docker network, không publish host ports.

| Public path | Upstream |
|---|---|
| `/` | `frontend:3000` |
| `/api/v1/` | `backend:8080` |
| `/actuator/` | `backend:8080` |
| `/swagger-ui/`, `/swagger-ui.html`, `/v3/api-docs/` | `backend:8080` |
| `/api/cameras/` | `worker:8090` |
| `/worker/health` | `worker:8090/health` |
| `/api/dashboard/metrics` | `monitoring-service:8091` |
| `/monitoring/health` | `monitoring-service:8091/health` |
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
| `monitoring-service` | `monitoring-service/Dockerfile` | internal `8091` | Dashboard metrics aggregator |
| `adminer` | `adminer:4.8.1` | `7001` | DB UI |
| `minio` console | `minio/minio` | `7002` | MinIO UI |
| `redisinsight` | `redis/redisinsight` | `7003` | Redis UI |
| `rabbitmq` UI | `rabbitmq:3.13-management-alpine` | `7004` | RabbitMQ management UI |
| `mariadb` | `mariadb:11.4` | `7005` | DB chính |
| `minio` API | `minio/minio` | `7006` | Snapshot object storage |
| `redis` | `redis:7.4-alpine` | `7007` | Debounce/cache |
| `rabbitmq` AMQP | `rabbitmq:3.13-management-alpine` | `7008` | Queue |

`video-detect/` và `mock-worker/` không nằm trong runtime compose: chúng là CLI/debug/test tools chạy khi cần.

---

## 🔧 Root `.env`

Root `.env.example` là superset biến deploy cho tất cả service:

- public bind/ports: `APP_BIND_ADDRESS=0.0.0.0` để máy cùng LAN truy cập app qua IP host, `FRONTEND_PORT` cho Nginx app entrypoint, infra ports `7001–7008`
- frontend public URLs: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_WORKER_URL`, `NEXT_PUBLIC_MONITORING_URL` (để trống để dùng same-origin Nginx)
- DB/RabbitMQ/MinIO creds
- backend auth: `JWT_SECRET`, `FIRESAFE_USERNAME`, `FIRESAFE_PASSWORD`
- preset camera seed: `FIRESAFE_PRESET_CAMERA_RTSP_URL`, `FIRESAFE_PRESET_CAMERA_NAME`, `FIRESAFE_PRESET_CAMERA_LOCATION`
- worker tuning: `AI_WORKER_CONF`, `AI_WORKER_RTSP_TRANSPORTS`, `AI_WORKER_RTSP_BUFFER_SIZE`, `AI_WORKER_OVERLAY_TTL_SECONDS`, `AI_WORKER_STATUS_CACHE_TTL_SECONDS`, `AI_WORKER_SUSTAINED_DETECTION_SECONDS`, `AI_MODEL_URL`, `AI_MODEL_PATH`, `HF_TOKEN`
- monitoring cache/host mounts: `MONITORING_CACHE_TTL_SECONDS`, `HOST_PROC`, `HOST_SYS`, `HOST_ROOT`

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

## 📊 Monitoring trong Docker

Native runtime là cách ổn định nhất để lấy CPU/RAM/Disk của host thật trên Windows.

Docker Compose Phase 8 cấu hình `monitoring-service` theo hướng Linux host metrics:

```yaml
privileged: true
volumes:
  - /proc:/host/proc:ro
  - /sys:/host/sys:ro
  - /:/host/root:ro
environment:
  HOST_PROC: /host/proc
  HOST_SYS: /host/sys
  HOST_ROOT: /host/root
```

`monitoring-service` dùng `psutil.PROCFS_PATH` và `HOST_ROOT` để đọc host Linux thật. Trên Docker Desktop Windows, container chạy trong Linux VM nên không bảo đảm phản ánh Windows host thật.

GPU vẫn optional qua `nvidia-smi`; nếu không có NVIDIA/tooling thì Dashboard hiển thị `N/A`.

`/api/dashboard/metrics` được cache trong Redis bằng key ngắn hạn, TTL mặc định `MONITORING_CACHE_TTL_SECONDS=2`. Mục tiêu là giảm scrape lặp từ nhiều dashboard/browser nhưng vẫn đủ gần realtime cho UI và cơ chế chặn mở thêm camera preview khi tải hệ thống ≥ 80%.

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
Invoke-RestMethod http://localhost:3000/monitoring/health
Invoke-RestMethod http://localhost:3000/api/dashboard/metrics
```

```bash
docker compose config --quiet
docker compose up --build -d
curl http://localhost:3000/health
curl http://localhost:3000/actuator/health
curl http://localhost:3000/worker/health
curl http://localhost:3000/monitoring/health
curl http://localhost:3000/api/dashboard/metrics
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

*Tài liệu phản ánh trạng thái infrastructure tại **Giai đoạn 8**. Native dev vẫn dùng `setup.ps1`/`setup.sh` + `docker-compose.dev.yml`; container runtime dùng root `.env` + `docker-compose.yml` full stack.*
