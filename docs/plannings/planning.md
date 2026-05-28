# 🔥 FireSafe — Project Roadmap & Context

> **Dành cho AI Agent:** File này vừa là lộ trình kỹ thuật, vừa là context để tiếp tục làm việc ở session mới.
> Đọc phần **"📍 Trạng thái hiện tại"** và **"🔜 Việc tiếp theo"** trước, sau đó đọc explanation file của giai đoạn cần làm việc.

---

## 📍 Trạng thái hiện tại

| | |
|---|---|
| **Giai đoạn đang thực hiện** | 🔄 Giai đoạn 8 — Containerization & Shadow Testing |
| **Giai đoạn tiếp theo** | ⏳ Giai đoạn 9 — Tối ưu hoá Toàn diện & Triển khai Production |
| **Workspace root** | project root |

## 🔜 Việc tiếp theo cần làm (Giai đoạn 8)

- [x] Chuẩn hóa AI Worker dùng `best.pt` mặc định, bỏ fallback `wildfire-smoke-fire.pt`
- [x] Tạo Dockerfiles cho backend, frontend, worker, monitoring-service
- [x] Tạo `docker-compose.yml` full stack: app services + infra + Adminer + RedisInsight
- [x] Tạo root `.env.example` cho Compose; Docker users chỉ cần `.env` ở root
- [x] Worker Docker tự tải/cache `best.pt` từ Hugging Face vào Docker volume
- [x] Monitoring Docker cấu hình Linux-only host metrics qua mounted `/proc`, `/sys`, `/`
- [x] Runtime smoke test `docker compose up --build -d` và mở `/`, `/api/dashboard/metrics`
- [x] Bổ sung Nginx reverse proxy cho Docker Compose: một app entrypoint, same-origin API, route `/api/v1/`, `/api/cameras/`, `/api/dashboard/metrics`
- [x] Ẩn host ports trực tiếp của `frontend`, `backend`, `worker`, `monitoring-service`; chỉ publish Nginx, infra UI/API ports
- [x] Quy hoạch default ports Compose theo runtime manager: app qua Nginx `3000`, infra `7001–7008`
- [x] Smoke test sau Nginx: health, frontend, backend, worker, monitoring, dashboard metrics qua same-origin
- [x] Thêm cơ chế chặn mở thêm camera preview khi hệ thống gần quá tải (CPU/RAM/GPU ≥ 80%) và hiển thị cảnh báo trên UI
- [x] Cache ngắn dashboard metrics trong Redis (`MONITORING_CACHE_TTL_SECONDS`, mặc định 2 giây)
- [x] Cache snapshot trạng thái camera trong RAM AI Worker (`AI_WORKER_STATUS_CACHE_TTL_SECONDS`, mặc định 1 giây)
- [ ] Shadow testing thực địa: uptime, latency end-to-end, false positive/negative
- [ ] Chuẩn bị checklist chuyển sang Giai đoạn 9: hardening, TLS/domain, backup/restore, observability production, image registry/release flow

## ✅ Việc đã hoàn thành gần đây (Giai đoạn 6–7)

- [x] Khởi tạo `ai-worker/` với YOLO video detection MVP
- [x] Tải model `.pt` vào `ai-worker/models/`
- [x] Chạy thử với video local và kiểm tra output bounding box
- [x] Mở rộng AI Worker thành module nhỏ + hỗ trợ upload MinIO + `POST /api/v1/alerts`
- [x] Thêm runtime manager `setup.ps1` (Windows) và `setup.sh` (Linux) để quản lý runtime local, tự chọn port trống, cấp port infra từ dải `7001+`, logs capped 50 dòng cuối/file và `.runtime/ports.env`; `up` tự chuẩn bị deps/env, `down` chỉ dừng runtime đã xác thực PID metadata và xóa `.runtime/`, `clean` xóa thêm generated artifacts + Docker volume/orphan thuộc compose project, không xóa shared images
- [x] Chạy E2E thật với AI Worker service, backend, MinIO, Redis, RabbitMQ
- [x] Mở rộng sang RTSP camera preview + detect realtime trên UI `/cameras`
- [x] Tách CLI video local sang `video-detect/`, không backend/MinIO/auth/alert
- [x] AI Worker chạy song song preview thread + detect thread để stream không bị YOLO chặn
- [x] AI Worker chia sẻ một RTSP capture cho nhiều camera dùng cùng `rtspUrl`, tránh mở trùng session vào camera/NVR
- [x] AI Worker tự fallback Hikvision mainstream `*01` sang substream `*02` khi mở RTSP fail, giúp nhiều channel chạy song song nhẹ hơn
- [x] AI Worker preview MJPEG luôn cập nhật frame mới, bbox realtime-ish theo TTL, alert theo sustained detection + camera/zone cooldown
- [x] Khởi tạo `monitoring-service/` scrape/aggregate metrics riêng cho Dashboard UI
- [x] Backend export metrics nhẹ qua `/actuator/prometheus` và `/api/v1/metrics/export`
- [x] AI Worker export Prometheus text metrics qua `/metrics`
- [x] Runtime manager start/stop monitoring-service, cấp `MONITORING_PORT`, ghi `NEXT_PUBLIC_MONITORING_URL`
- [x] Dashboard UI hiển thị CPU/GPU/RAM/disk/API/Redis/RabbitMQ/MinIO/alerts/AI Worker metrics; CPU/RAM/Disk lấy từ máy thật host qua `psutil`, GPU qua `nvidia-smi` nếu có

## ✅ Checklist bắt buộc SAU MỖI TASK

> Mỗi khi hoàn thành một task, phải thực hiện đủ 4 bước này trước khi báo xong:

1. **Cập nhật nội dung** explanation file liên quan (cây cấu trúc, phần giải thích)
2. **Cập nhật footer** của explanation file → ghi đúng giai đoạn hiện tại
3. **Cập nhật `planning.md`** → đổi trạng thái giai đoạn, "Việc tiếp theo", "Những gì đã làm"
4. **Kiểm tra lại** bằng cách đọc footer của tất cả explanation files — phải cùng số giai đoạn

---

## 📐 Kiến trúc Tổng quan

```
                        ┌─────────────┐
                        │   Browser   │
                        └──────┬──────┘
                               │ HTTPS
                               ▼
                    ┌──────────────────────┐
                    │     Nginx (Gateway)  │
                    │  SSL Termination     │
                    └────┬─────────────────┘
                         │
            ┌────────────┴─────────────┐
            │ /                        │ /api/*
            ▼                          ▼
  ┌──────────────────┐     ┌───────────────────────────────────┐
  │  Next.js (SSR)   │     │       Backend API (Spring Boot)   │
  │  - Dashboard     │     │  JWT Auth ──▶ Redis Debounce      │
  │  - Alert list    │     │          ──▶ MariaDB              │
  │  - Camera mgmt   │     │          ──▶ RabbitMQ Producer    │
  │  - Login         │     └──────────┬────────────────────────┘
  └──────────────────┘                │
                                      ▼
                             ┌─────────────────┐
                             │   RabbitMQ      │
                             └────────┬────────┘
                                      │
                             ┌────────▼────────┐
                             │  Spring Worker  │
                             │ (AMQP Consumer) │
                             │    Telegram     │
                             └─────────────────┘

  ┌──────────────────────────────────────────────┐
  │              AI Worker (Python)              │
  │  Camera RTSP ──▶ FFmpeg/OpenCV               │
  │             ──▶ YOLO + ONNX/TensorRT         │
  │             ──▶ Upload ảnh ──▶ MinIO         │
  │             ──▶ POST /api/v1/alerts (Nginx)  │
  └──────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │              Monitoring Stack                │
  │  Prometheus ──▶ scrape all services          │
  │  Grafana    ──▶ Dashboard                    │
  └──────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc Project Hiện tại

```
project-root/
│
├── docs/
│   ├── plannings/
│   │   └── planning.md                    ← File này
│   └── explanations/
│       ├── backend-explanation.md         ← Giải thích toàn bộ backend/
│       ├── infrastructure-explanation.md  ← Giải thích docker-compose.dev.yml + runtime manager
│       ├── monitoring-service-explanation.md ← Giải thích monitoring-service/
│       ├── mock-worker-explanation.md     ← Giải thích mock-worker/
│       ├── frontend-explanation.md        ← Giải thích frontend/ (Next.js)
│       ├── ai-worker-explanation.md       ← Giải thích ai-worker/ RTSP preview + YOLO detect realtime
│       └── video-detect-explanation.md    ← Giải thích video-detect/ CLI debug offline
│
├── .agents/rules/
│   ├── andrej-karpathy-skills.md          ← Quy tắc viết code
│   ├── update-explanation.md              ← Rule cập nhật explanation
│   └── update-planning.md                 ← Rule cập nhật planning
│
├── backend/                               ← Spring Boot (Java 21, Maven)
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/...
│
├── mock-worker/                           ← Python E2E test suite độc lập (Giai đoạn 4)
│   ├── mock_worker.py
│   ├── requirements.txt
│   ├── run-mock-worker.ps1
│   └── run-mock-worker.sh
│
├── ai-worker/                             ← YOLO RTSP service chính (host process)
│   ├── service.py                         ← HTTP API: start/stop/status/MJPEG stream/metrics
│   ├── Dockerfile                         ← Worker container image + model auto-download entrypoint
│   ├── docker-entrypoint.sh               ← Tải/cache best.pt vào Docker volume nếu thiếu
│   ├── requirements.txt
│   ├── src/
│   │   ├── camera_worker.py               ← RTSP reader thread + YOLO detector thread
│   │   ├── backend_client.py              ← Login backend + POST alert
│   │   ├── storage.py                     ← Upload snapshot MinIO
│   │   ├── snapshot.py                    ← Encode frame PNG
│   │   └── config.py                      ← Model path config
│   └── models/                            ← Native dev đặt best.pt nếu không truyền --model
│
├── monitoring-service/                    ← Scrape/aggregate metrics cho Dashboard UI
│   ├── service.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── video-detect/                          ← CLI debug video/image offline, tách khỏi AI Worker service
│   ├── detect_video.py
│   ├── requirements.txt
│   ├── run-video-detect.ps1
│   ├── run-video-detect.sh
│   ├── src/
│   ├── models/
│   └── runs/
│
├── frontend/                              ← Next.js 16 (TypeScript, Tailwind)
│   ├── Dockerfile
│   ├── src/app/
│   │   ├── page.tsx                       ← Dashboard tổng quan (cards + 5 alert mới nhất)
│   │   ├── login/page.tsx                 ← Trang đăng nhập
│   │   ├── alerts/page.tsx                ← Danh sách alert đầy đủ + xóa từng alert/xóa tất cả
│   │   ├── alerts/[id]/page.tsx           ← Chi tiết alert
│   │   └── cameras/page.tsx              ← Quản lý camera
│   ├── src/components/
│   │   └── Sidebar.tsx                    ← Navigation sidebar
│   ├── src/hooks/                         ← Custom hooks (logic state & fetch)
│   │   ├── useAlerts.ts
│   │   ├── useAlert.ts
│   │   └── useCameras.ts
│   ├── src/lib/
│   │   ├── api.ts                         ← API client + types
│   │   └── auth.ts                        ← JWT cookie helpers
│   └── .env.local                         ← Auto-generated: NEXT_PUBLIC_API_URL + NEXT_PUBLIC_AI_WORKER_URL + NEXT_PUBLIC_MONITORING_URL
│
├── .env.example                           ← Root env mẫu cho Docker Compose full stack
├── docker-compose.yml                     ← Full stack Docker Compose cho Giai đoạn 8
├── setup.ps1                              ← Runtime manager Windows: up/down/clean infra + backend + frontend + AI Worker + monitoring-service
├── setup.sh                               ← Runtime manager Linux: up/down/clean infra + backend + frontend + AI Worker + monitoring-service
└── docker-compose.dev.yml                 ← Infra-only dev compose: MariaDB, Redis, RabbitMQ,
                                             MinIO, Adminer, RedisInsight
```

---

## 🔑 Thông tin kết nối (Dev Local)

| Service | URL / Port | Credentials |
|---|---|---|
| Spring Boot API | `http://localhost:<BACKEND_PORT>` | — |
| Swagger UI | `http://localhost:<BACKEND_PORT>/swagger-ui.html` | JWT từ `admin@nhattienchung.vn` / `admin123` |
| MariaDB | `localhost:<MARIADB_PORT>` | `firesafe` / `firesafe` / DB: `firesafe` |
| Adminer (DB UI) | `http://localhost:<ADMINER_PORT>` | System: MySQL, Server: `mariadb`, user: `firesafe` |
| Redis | `localhost:<REDIS_PORT>` | Không có auth |
| RedisInsight | `http://localhost:<REDISINSIGHT_PORT>` | Host: `firesafe-redis`, port `6379` |
| RabbitMQ | `localhost:<RABBITMQ_PORT>` | `guest` / `guest` |
| RabbitMQ UI | `http://localhost:<RABBITMQ_UI_PORT>` | `guest` / `guest` |
| MinIO API | `http://localhost:<MINIO_API_PORT>` | `minioadmin` / `minioadmin` |
| MinIO Console | `http://localhost:<MINIO_CONSOLE_PORT>` | `minioadmin` / `minioadmin` |

Port thực tế xem tại:

```powershell
Get-Content .runtime\ports.env
```

```bash
cat .runtime/ports.env
```

---

## 🗓️ Lộ trình Chi tiết

---

### ✅ Giai đoạn 1 — Thiết kế Kiến trúc & API Contract *(Tuần 1–2)*

> **Trạng thái: HOÀN THÀNH**
> **Context:** Không có file explanation riêng — toàn bộ output là bản thiết kế được ghi trong file này bên dưới.

**Mục tiêu:** Định hình toàn bộ khung hệ thống *trên giấy* trước khi viết một dòng code.

#### Stack công nghệ đã chốt

| Layer | Thành phần | Công nghệ |
|---|---|---|
| **API Gateway** | Nginx | Reverse proxy, SSL termination, route `/api/*` → Spring Boot, `/` → Next.js |
| **Frontend** | Next.js (App Router) | Dashboard real-time, quản lý camera, login |
| **Backend** | Spring Boot | Spring Web + Security + Data JPA + AMQP |
| **Database** | MariaDB | Lưu trữ dữ liệu chính |
| **Cache / Debounce** | Redis | Chống spam alert |
| **Object Storage** | MinIO | Lưu ảnh snapshot (S3-compatible, tự host) |
| **Broker** | RabbitMQ | Message queue gửi notification async |
| **Worker** | Spring AMQP Consumer | Consume queue → gửi Telegram notification |
| **AI Worker** | Python + FFmpeg + YOLO + ONNX | Đọc RTSP, inference, gửi alert về backend |
| **API Docs** | Springdoc OpenAPI | Swagger UI tại `/swagger-ui.html` |
| **Monitoring** | Prometheus + Grafana | Thu thập metrics, dashboard IT |
| **Packaging** | Docker + Docker Compose | Toàn bộ service dưới dạng container |

#### Thiết kế Database Schema (MariaDB)

| Bảng | Các cột chính |
|---|---|
| `cameras` | `id`, `name`, `rtsp_url`, `location`, `is_active`, `created_at` |
| `alerts` | `id`, `camera_id`, `detected_at`, `confidence`, `label`, `image_url`, `status` |
| `users` | `id`, `username`, `password_hash`, `email`, `is_active` |
| `roles` | `id`, `name` (`ROLE_ADMIN`, `ROLE_VIEWER`) |
| `user_roles` | `user_id`, `role_id` |

#### Định nghĩa API Contract

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Đăng nhập bằng email `@nhattienchung.vn` + password để lấy JWT token |
| `POST` | `/api/v1/auth/register` | — | Đăng ký viewer pending bằng email `@nhattienchung.vn`; cần Admin kích hoạt trước khi login |
| `POST` | `/api/v1/alerts` | JWT Bearer | AI Worker gửi cảnh báo mới |
| `GET` | `/api/v1/alerts` | JWT Bearer | Danh sách cảnh báo (phân trang) |
| `GET` | `/api/v1/alerts/{id}` | JWT Bearer | Chi tiết một cảnh báo |
| `DELETE` | `/api/v1/alerts` | JWT + ADMIN | Xóa tất cả cảnh báo, cleanup MinIO snapshot và Redis debounce |
| `DELETE` | `/api/v1/alerts/{id}` | JWT + ADMIN | Xóa một cảnh báo, cleanup MinIO snapshot và Redis debounce nếu key còn trỏ tới alert đó |
| `GET` | `/api/v1/cameras` | JWT Bearer | Danh sách camera |
| `POST` | `/api/v1/cameras` | JWT + ADMIN | Thêm camera mới |
| `PUT` | `/api/v1/cameras/{id}` | JWT + ADMIN | Cập nhật thông tin camera |
| `DELETE` | `/api/v1/cameras/{id}` | JWT + ADMIN | Xóa camera |
| `GET` | `/api/v1/users` | JWT + ADMIN | Quản lý người dùng |

**Payload mẫu AI Worker gửi về (`POST /api/v1/alerts`):**
```json
{
  "cameraId": 1,
  "confidence": 0.91,
  "label": "fire",
  "imageUrl": "http://localhost:<MINIO_API_PORT>/snapshots/cam-001/...png",
  "detectedAt": "2026-05-20T10:30:00"
}
```

---

### ✅ Giai đoạn 2 — Backend Core *(Tuần 3–4)*

> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [`docs/explanations/backend-explanation.md`](../explanations/backend-explanation.md) để hiểu toàn bộ cấu trúc, luồng dữ liệu và chức năng từng file trong `backend/`.

**Mục tiêu:** Backend skeleton hoàn chỉnh, API hoạt động đầy đủ, test được độc lập không cần AI hay Frontend.

**Những gì đã làm:**
- Spring Boot 3.5 + Maven, Java 21
- Flyway migrations: `V1__init_schema.sql` (5 bảng + indexes), `V2__seed_data.sql` (roles, admin mặc định; không seed camera fake)
- Entities: `User`, `Role`, `Camera`, `Alert` với JPA mapping đúng quan hệ
- Repositories: `UserRepository`, `CameraRepository`, `AlertRepository` với pagination
- JWT Security: `JwtUtils`, `JwtAuthFilter`, `UserDetailsServiceImpl`, `SecurityConfig`
- Services: `AlertService` (Redis debounce + RabbitMQ publish), `CameraService` (CRUD), `NotificationWorker` (RabbitMQ consumer — placeholder)
- Controllers: `AuthController`, `AlertController`, `CameraController` với role-based auth
- DTOs: tách biệt hoàn toàn khỏi Entity
- `GlobalExceptionHandler` — RFC 7807 ProblemDetail
- `OpenApiConfig` — Swagger UI tại `/swagger-ui.html` với JWT Bearer scheme
- `RabbitMQConfig` — khai báo Exchange, Queue, Binding
- `docker-compose.dev.yml` với 6 service: MariaDB, Redis, RabbitMQ, MinIO, Adminer, RedisInsight

**Lưu ý quan trọng:**
- Default admin: `admin@nhattienchung.vn` / `admin123`
- JWT secret phải thay bằng key dài hơn khi deploy production
- `NotificationWorker` ban đầu là placeholder; Giai đoạn 3 đã tích hợp Telegram notification + retry

---

### ✅ Giai đoạn 3 — Cache, Storage & Message Queue *(Tuần 5–6)*

> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [`docs/explanations/backend-explanation.md`](../explanations/backend-explanation.md) — đặc biệt section `service/MinioService`, `service/TelegramNotificationService`, và `service/NotificationWorker`.

**Những gì đã làm:**
- `MinioService.java` — tự tạo bucket khi khởi động, upload file, tạo pre-signed URL (7 ngày)
- `TelegramNotificationService.java` — gọi Telegram Bot API với message HTML định dạng, bật/tắt qua `TELEGRAM_ENABLED`
- `NotificationWorker.java` — retry exponential backoff (2s→4s→8s) khi 429, không retry khi 403 (quota)
- Config `application.yml`: thêm `telegram.*` và `notification.retry.*`

**Lưu ý:**
- Telegram mặc định `enabled=false` — set `TELEGRAM_ENABLED=true` + `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` để bật
- Kênh notification hiện tại là Telegram; các kênh khác chỉ nên thêm khi có yêu cầu thật

---

### ✅ Giai đoạn 4 — Mock AI Worker & End-to-End Test *(Tuần 7)*

> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [`docs/explanations/mock-worker-explanation.md`](../explanations/mock-worker-explanation.md).

**Những gì đã làm:**
- `mock-worker/mock_worker.py` — E2E test suite 5 test case:
  - Test 1: JWT login (`admin@nhattienchung.vn`/`admin123`) → nhận token
  - Test 2: `GET /api/v1/cameras` → lấy camera đầu tiên làm camera test
  - Test 3: Tạo ảnh PNG giả bằng Pillow → upload MinIO → lấy URL
  - Test 4: `POST /api/v1/alerts` → verify alert trong DB qua `GET /api/v1/alerts/{id}`
  - Test 5: Gửi 10 alerts liên tiếp → verify Redis debounce (chỉ 1 notification)
- Hỗ trợ chạy từng test riêng: `--test minio|pipeline|debounce`
- Mock-worker chỉ chạy khi gọi runner `mock-worker/run-mock-worker.ps1` trên Windows, `mock-worker/run-mock-worker.sh` trên Linux hoặc chạy thủ công, không nằm trong luồng runtime manager `up`.

> ✅ **Checkpoint:** Backend là "hộp đen" hoàn chỉnh. Từ đây, Frontend và AI Worker chỉ cần tuân theo API Contract là tích hợp được.

---

### ✅ Giai đoạn 5 — Frontend (Next.js) *(Tuần 8–9)*

> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [`docs/explanations/frontend-explanation.md`](../explanations/frontend-explanation.md).

**Những gì đã làm:**
- Khởi tạo Next.js 16 (TypeScript, Tailwind CSS, App Router) tại `frontend/`
- Tách biệt UI (Component), Logic (Hooks) và Data (Services/lib).
- `src/hooks/use*.ts` — Custom hooks quản lý state (loading, error, reload)
- `src/lib/api.ts` — API client tập trung, typed interfaces Alert/Camera
- `src/lib/auth.ts` — JWT lưu vào cookie (js-cookie), helpers `getToken()`, `isAdmin()`
- Fix lỗi SSR Hydration mismatch bằng `useEffect` trong `Sidebar`.
- Thêm `spring-boot-devtools` cho Backend auto-reload.
- **Trang Login** (`/login`) — form đăng nhập, lưu JWT, redirect về dashboard
- **Trang Register** (`/register`) — đăng ký viewer pending bằng email `@nhattienchung.vn`, chờ Admin kích hoạt trước khi login
- **Dashboard** (`/`) — monitoring tổng quan: backend status, alert/camera metrics, AI Worker runtime, 5 alert mới nhất
- **Alerts** (`/alerts`) — danh sách alert đầy đủ, phân trang, xóa từng alert/xóa tất cả
- **Alert Detail** (`/alerts/[id]`) — ảnh hiện trường, thông tin đầy đủ, xóa alert hiện tại
- **Cameras** (`/cameras`) — card grid camera, thêm/xóa (chỉ ADMIN)
- **Sidebar** — navigation chung, logout, hiển thị username/role
- `frontend/.env.local` — được runtime manager `up` tự tạo từ port runtime: `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_AI_WORKER_URL`

**Chạy frontend:**
```powershell
cd frontend
npm run dev   # http://localhost:3000
```

---

### ✅ Giai đoạn 6 — Phát triển & Tối ưu AI Model *(Tuần 10–13)*

> **Trạng thái: HOÀN THÀNH MVP; tiếp tục tune nếu có camera/phần cứng thật**
> **Context cho session mới:** Đọc [`docs/explanations/ai-worker-explanation.md`](../explanations/ai-worker-explanation.md) để hiểu RTSP service; đọc [`docs/explanations/video-detect-explanation.md`](../explanations/video-detect-explanation.md) để hiểu CLI debug video/image offline.

**Mục tiêu:** Xây dựng AI Worker thật thay thế Mock, kết nối vào backend đã ổn định.

**Quyết định hiện tại:** Đã chuyển model chính sang `TommyNgx/YOLOv10-Fire-and-Smoke-Detection` và chuẩn hóa file mặc định là `best.pt`. Model `odiug77/wildfire-smoke-fire` từ Hugging Face chỉ còn là tham chiếu/thử nghiệm trước đó, không còn là fallback mặc định của AI Worker.

**Những gì đã làm:**
- Tách `video-detect/` thành CLI debug video/image offline riêng, chỉ dùng `--source`, `--model`, `--conf`, `--show`, `--save`.
- Giữ `ai-worker/` là HTTP service chính cho RTSP preview, detect realtime và gửi alert; Python service dùng mặc định `models/best.pt` nếu không truyền `--model`.
- Tách AI Worker service thành các module: `config.py`, `camera_worker.py`, `detector.py`, `snapshot.py`, `storage.py`, `backend_client.py`.
- `camera_worker.py` hiện tách shared RTSP reader cập nhật MJPEG preview liên tục và YOLO detector lấy frame mới nhất theo interval để detect/alert; nhiều camera dùng cùng `rtspUrl` sẽ reuse một capture, Hikvision mainstream `*01` fail thì fallback substream `*02`.
- Thêm guard chống spam camera: bấm Start nhiều lần không tạo thêm RTSP session; reconnect backoff 5s → 10s → 20s → 30s.
- Thêm backend `PresetCameraSeeder` đọc `backend/.env.local` để seed camera RTSP làm sẵn khi `FIRESAFE_PRESET_CAMERA_RTSP_URL` khác rỗng; bỏ seed camera fake `Camera-Test-01`.
- Thêm dependencies service `ultralytics`, `opencv-python`, `requests`, `minio`.
- Thêm `setup.ps1` (Windows) và `setup.sh` (Linux) để chạy/dừng/dọn runtime local, tự chọn port trống, cấp port infra từ dải `7001+`, lưu log vào `.runtime/logs/` và port vào `.runtime/ports.env`.
- Runtime manager `up` tự kiểm tra/tạo runtime cần thiết: Java 21 project-local nếu máy chưa có, `frontend/node_modules` qua `npm install`, AI Worker `venv` + `requirements.txt`, và `frontend/.env.local` với `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_AI_WORKER_URL`.
- Runtime manager `down` chỉ dừng AI Worker/frontend/backend/infra và xóa `.runtime/`; giữ `venv`, `node_modules`, `.next`, `backend/target`, local JDK để lần sau khởi động nhanh.
- Runtime manager `clean` làm toàn bộ việc của `down`, dọn Docker container/volume/orphan thuộc compose project, không xóa shared images, rồi xóa thêm `ai-worker/venv/`, `frontend/node_modules/`, `frontend/.next/`, `backend/target/`, local JDK (`jdk-21.0.3+9/` trên Windows, `jdk-21-linux/` trên Linux).
- Runtime manager `up` quản lý AI Worker như host service cùng backend/frontend/infra.
- Cập nhật `/cameras`: nhập RTSP URL, Start/Stop Detect, MJPEG preview lớn hơn, delete camera xử lý đúng response `204 No Content`.
- Fix hydration/token issues bằng cách đọc cookie auth sau mount trong `useEffect`.
- Tạo/cập nhật `docs/explanations/ai-worker-explanation.md`.

#### 6a. MVP nhận diện video local *(Hoàn thành bước đầu)*
- [x] Chuẩn bị script load YOLO `.pt` bằng Ultralytics.
- [x] Nhận input video/image bằng `--source`.
- [x] Hỗ trợ `--conf`, `--show`, `--save`.
- [x] Tải model `.pt` vào `video-detect/models/` hoặc truyền `--model`; CLI offline vẫn giữ cơ chế chọn model riêng trong `video-detect/`.
- [x] Chạy thử với video local và kiểm tra bounding box.
- [x] Tách CLI local sang `video-detect/`, không backend/MinIO/auth/alert.
- [x] Thêm `video-detect/run-video-detect.ps1` trên Windows và `video-detect/run-video-detect.sh` trên Linux để tự tạo venv, cài deps và forward args vào CLI.

#### 6b. Tích hợp backend sau khi model chạy ổn *(Hoàn thành MVP)*
- [x] Upload snapshot lên MinIO.
- [x] Login backend lấy JWT.
- [x] POST `/api/v1/alerts` với `cameraId`, `label`, `confidence`, `imageUrl`, `detectedAt`.
- [x] Dùng Redis debounce/RabbitMQ notification sẵn có ở backend.
- [x] Chạy E2E thật qua AI Worker service và xác nhận alert xuất hiện trong DB/frontend.

#### 6c. RTSP realtime service *(Hoàn thành MVP; tiếp tục tune thực địa nếu cần)*
- [x] Đọc RTSP bằng OpenCV/FFmpeg backend.
- [x] Preview MJPEG realtime trên UI `/cameras`.
- [x] Start/Stop detect theo từng camera từ UI.
- [x] Tách preview thread khỏi detect thread để stream không bị YOLO chặn.
- [x] Chia sẻ một RTSP capture cho nhiều camera dùng cùng `rtspUrl`, tránh mở trùng session vào camera/NVR.
- [x] Fallback Hikvision mainstream `*01` sang substream `*02` khi mở RTSP fail để nhiều channel chạy song song nhẹ hơn.
- [x] Upload snapshot MinIO + POST alert backend khi detect fire/smoke.
- [x] Chống spam reconnect/start để tránh camera block.
- [x] Tune bước đầu `--conf`, detection interval, resolution/FPS theo camera thật.
- [ ] Đo FPS/latency thực tế sâu hơn sau khi camera chạy ổn định.

#### 6d. Tối ưu production sau MVP
- Export ONNX; nếu có GPU NVIDIA thì cân nhắc TensorRT.
- Benchmark FPS/latency, đảm bảo SLA ≤ 10 giây end-to-end.
- Expose metrics GPU/FPS/RTSP status cho Prometheus.

---

### ✅ Giai đoạn 7 — Giám sát Hệ thống *(Tuần 14)*

> **Trạng thái: HOÀN THÀNH MVP; còn runtime smoke test cuối nếu cần xác nhận trên máy hiện tại**
> **Context cho session mới:** Đọc [`docs/explanations/monitoring-service-explanation.md`](../explanations/monitoring-service-explanation.md), [`frontend-explanation.md`](../explanations/frontend-explanation.md), [`backend-explanation.md`](../explanations/backend-explanation.md), [`ai-worker-explanation.md`](../explanations/ai-worker-explanation.md).

**Mục tiêu:** Hệ thống "sống" 24/7 và tự báo cáo "sức khỏe" trên Dashboard UI, không cần Grafana cho local MVP.

#### Thu thập Metrics *(Hoàn thành MVP)*
- [x] **Monitoring service:** `monitoring-service/` scrape/aggregate metrics từ Backend, AI Worker, Redis, RabbitMQ, MinIO và host system; trả `GET /api/dashboard/metrics` cho UI.
- [x] **Backend:** `/actuator/prometheus` export JVM/API metrics; `GET /api/v1/metrics/export` export business metrics nhẹ: alert totals, hourly/byLabel, camera total/active.
- [x] **AI Worker:** `GET /metrics` export Prometheus text: workers/sources/camera running/hasFrame/error, detections, alerts sent, inference avg.
- [x] **Frontend Dashboard:** `/` đọc `NEXT_PUBLIC_MONITORING_URL`, hiển thị cards CPU/GPU/RAM/disk/API/infra/alerts và charts alert theo giờ/label.
- [x] **Grafana/Prometheus container:** không dùng trong local MVP; defer cho production nếu cần dashboard ngoài app.

#### Dashboard UI Monitoring *(Hoàn thành MVP)*
- [x] Backend UP/DOWN, requests total, avg latency, error rate, uptime.
- [x] System: CPU, RAM/disk used-total qua `psutil`, GPU `%` + VRAM qua `nvidia-smi` nếu có NVIDIA.
- [x] Infra: Redis memory/keys, RabbitMQ messages/consumers, MinIO object count/bytes.
- [x] Alert count: total, NEW, last 24h, high confidence last 24h, hourly chart, by-label chart.
- [x] AI Worker: UP/DOWN, số workers/sources, trạng thái/counters từng camera đang detect.
- [x] 5 alert mới nhất để xem nhanh; quản lý đầy đủ ở `/alerts`.

#### Việc còn lại sau MVP
- [ ] Runtime smoke test `setup.ps1 up` và mở `/api/dashboard/metrics` + `/` trên máy hiện tại.

---

### 🔄 Giai đoạn 8 — Containerization & Shadow Testing *(Tuần 15–16)*

> **Trạng thái: ĐANG THỰC HIỆN**
> **Context cho session mới:** Đọc [`docs/explanations/infrastructure-explanation.md`](../explanations/infrastructure-explanation.md), sau đó đọc explanation file của service cần debug.

**Mục tiêu:** Đóng gói hoàn chỉnh bằng Docker Compose, chạy thử thực địa trước khi go-live.

#### Docker Compose Stack

`docker-compose.yml` chạy full stack bằng root `.env`:

```yaml
services:
  nginx:                # Reverse proxy / app entrypoint duy nhất cho browser
  frontend:             # Next.js UI, internal behind Nginx
  backend:              # Spring Boot API, internal behind Nginx
  worker:               # AI Worker RTSP preview/detect, auto-download/cache best.pt
  monitoring-service:   # Dashboard metrics aggregator, internal behind Nginx
  mariadb:              # Database
  redis:                # Cache/Debounce
  rabbitmq:             # Message Broker + Management UI
  minio:                # Object Storage + Console
  adminer:              # MariaDB web UI
  redisinsight:         # Redis web UI
```

**Env strategy:** Docker users copy root `.env.example` → `.env`; Compose injects vars into containers. Service-local `.env.local` files remain only for native `setup.ps1`/`setup.sh` dev mode.

**Nginx strategy:** Compose default chỉ publish Nginx cho app (`FRONTEND_PORT=3000` → container `nginx:80`). `frontend`, `backend`, `worker`, `monitoring-service` chỉ expose trong Docker network, không publish trực tiếp ra host. Frontend Docker mode dùng same-origin URLs rỗng để browser gọi `/api/v1/*`, `/api/cameras/*`, `/api/dashboard/metrics` qua Nginx. Nginx dùng Docker DNS resolver `127.0.0.11` để tránh giữ IP container cũ sau khi service recreate.

**Nginx route map:**

| Public path | Upstream |
|---|---|
| `/` | `frontend:3000` |
| `/api/v1/` | `backend:8080` |
| `/actuator/`, `/swagger-ui/`, `/v3/api-docs/` | `backend:8080` |
| `/api/cameras/` | `worker:8090` |
| `/worker/health` | `worker:8090/health` |
| `/api/dashboard/metrics` | `monitoring-service:8091` |
| `/monitoring/health` | `monitoring-service:8091/health` |

**Compose port layout:** default root `.env.example` dùng app entrypoint `FRONTEND_PORT=3000`; infra theo dải runtime manager: `ADMINER_PORT=7001`, `MINIO_CONSOLE_PORT=7002`, `REDISINSIGHT_PORT=7003`, `RABBITMQ_UI_PORT=7004`, `MARIADB_PORT=7005`, `MINIO_API_PORT=7006`, `REDIS_PORT=7007`, `RABBITMQ_PORT=7008`.

**Worker model:** mặc định `best.pt`; container tự tải từ Hugging Face `/resolve/main/best.pt` vào volume `ai_worker_models` nếu chưa có. Nếu model repo yêu cầu auth, dùng `HF_TOKEN`. Docker image pin PyTorch CPU-only để tránh kéo CUDA wheels nặng; GPU/TensorRT là tối ưu production riêng.

**Camera preview/load guard:** Frontend cho phép mở nhiều MJPEG preview, nhưng trước khi mở thêm sẽ đọc `/api/dashboard/metrics` và chặn nếu CPU/RAM/GPU cao nhất ≥ 80%. Status camera được cache snapshot ngắn trong RAM AI Worker mặc định 1 giây để giảm polling trực tiếp vào worker.

**Monitoring host metrics/cache:** Docker mode dùng Linux-only privileged/mounted host `/proc`, `/sys`, `/` để đọc host metrics. Docker Desktop Windows không bảo đảm phản ánh Windows host thật. `/api/dashboard/metrics` được cache ngắn trong Redis mặc định 2 giây để tránh nhiều dashboard/browser scrape toàn bộ dependency liên tục nhưng vẫn giữ dữ liệu gần realtime.

#### Shadow Testing (2–3 tuần song song)
- Chạy hệ thống **song song** với hệ thống báo cháy vật lý hiện tại
- **Không** dùng làm nguồn cảnh báo chính thức trong giai đoạn này
- Đo lường: latency end-to-end, False Positive/Negative rate, uptime
- Kết quả → quyết định go-live

---

### ⏳ Giai đoạn 9 — Tối ưu hoá Toàn diện & Triển khai Production *(Sau Shadow Testing)*

> **Trạng thái: CHƯA BẮT ĐẦU**
> **Context cho session mới:** Bắt đầu từ kết quả Shadow Testing của Giai đoạn 8, sau đó đọc `infrastructure-explanation.md`, `backend-explanation.md`, `ai-worker-explanation.md`, `frontend-explanation.md`, `monitoring-service-explanation.md`.

**Mục tiêu:** Chuyển FireSafe từ Docker Compose MVP/shadow mode sang hệ thống production có domain/TLS, bảo mật, backup, release flow, observability và tối ưu hiệu năng đủ để vận hành dài hạn.

#### 9a. Production ingress & security hardening
- [ ] Chốt domain/subdomain và HTTPS/TLS cho Nginx reverse proxy.
- [ ] Thêm redirect HTTP → HTTPS, security headers, upload/body-size limits, timeout chuẩn cho MJPEG/RTSP bridge.
- [ ] Siết CORS theo domain thật; tránh wildcard ngoài môi trường local.
- [ ] Đổi toàn bộ default secrets: `JWT_SECRET`, DB/RabbitMQ/MinIO creds, Telegram token, admin password.
- [ ] Thiết kế cơ chế quản lý secrets: `.env` production ngoài repo, Docker secrets hoặc secret manager nếu triển khai cloud/on-prem có hỗ trợ.
- [ ] Kiểm tra không expose trực tiếp backend/worker/monitoring ra internet; chỉ expose Nginx và các UI admin khi cần qua VPN/LAN.

#### 9b. Image registry & release flow
- [ ] Chuẩn hóa image tags cho `backend`, `frontend`, `worker`, `monitoring-service`: semver hoặc git SHA.
- [ ] Push images lên registry (Docker Hub/GHCR/private registry).
- [ ] Tách compose deploy artifact: `docker-compose.yml` + `.env` + Nginx config cần thiết, không phụ thuộc source tree.
- [ ] Thêm release checklist: build, scan, smoke test, tag, push, deploy, rollback.
- [ ] Cân nhắc CI/CD nếu repo đã ổn định: build/test/push images tự động.

#### 9c. Data persistence, backup & restore
- [ ] Thiết kế backup MariaDB định kỳ và restore drill.
- [ ] Thiết kế backup MinIO snapshots hoặc lifecycle retention.
- [ ] Cấu hình Redis/RabbitMQ persistence phù hợp với yêu cầu vận hành.
- [ ] Document quy trình restore sau lỗi máy chủ/mất volume.
- [ ] Xác định retention cho alerts/snapshots/logs để tránh đầy disk.

#### 9d. Observability production
- [ ] Chốt dashboard production: giữ Dashboard nội bộ hiện tại hoặc bổ sung Prometheus/Grafana.
- [ ] Thêm alerting vận hành: backend DOWN, worker DOWN, Redis/RabbitMQ/MinIO DOWN, disk gần đầy, camera offline, inference latency cao.
- [ ] Chuẩn hóa log rotation cho Docker containers và runtime logs.
- [ ] Theo dõi uptime/SLO: API latency, alert end-to-end latency, false positive/negative rate.

#### 9e. AI Worker performance & reliability
- [ ] Benchmark FPS/latency theo camera thật sau Shadow Testing.
- [ ] Tune `AI_WORKER_CONF`, detection interval, sustained detection seconds, RTSP transports/buffer.
- [ ] Cân nhắc ONNX Runtime/TensorRT nếu có GPU NVIDIA và cần FPS/latency tốt hơn.
- [ ] Tối ưu model/container GPU riêng, không làm CPU-default image nặng hơn.
- [ ] Hardening RTSP network: VLAN/LAN-only, reconnect policy, camera credential rotation.

#### 9f. Frontend/backend production readiness
- [ ] Kiểm tra auth/session UX: token expiry, logout, role boundaries, pending viewer flow.
- [ ] Chạy test regression các luồng chính: login, cameras, alerts, dashboard, delete cleanup.
- [ ] Kiểm tra OpenAPI/Swagger exposure: chỉ bật nội bộ hoặc bảo vệ bằng VPN/auth.
- [ ] Chuẩn hóa error page/loading states cho môi trường production.

#### 9g. Go-live decision
- [ ] Tổng hợp Shadow Testing report: uptime, latency, FP/FN, sự cố vận hành.
- [ ] Xác định phạm vi dùng chính thức: cảnh báo phụ trợ hay nguồn cảnh báo chính.
- [ ] Lập rollback plan và người chịu trách nhiệm vận hành.
- [ ] Chốt checklist go-live và lịch bảo trì sau triển khai.

---

## 📊 Đánh giá Tính Khả Thi

### ✅ Điểm mạnh

| Hạng mục | Nhận xét |
|---|---|
| **Chiến lược "Framework First"** | Backend hoàn thiện trước → Frontend và AI tích hợp dễ dàng, giảm rework |
| **API Contract rõ ràng từ đầu** | Hai team AI / Frontend có thể làm song song từ Giai đoạn 5–6 |
| **Mock AI Worker (Giai đoạn 4)** | Kiểm thử toàn bộ backend pipeline không cần chờ model AI |
| **Nginx làm Gateway** | SSL termination + routing tập trung, không cần Kong phức tạp |
| **Redis Debounce** | Chống spam alert — chi tiết quan trọng mà nhiều hệ thống thực tế bỏ qua |
| **ONNX làm trung gian** | Cùng một model chạy được trên môi trường có/không có GPU NVIDIA |
| **Shadow Testing** | Giảm rủi ro go-live, có số liệu thực tế để quyết định |

### ⚠️ Rủi ro & Điểm cần làm rõ

| Hạng mục | Vấn đề | Gợi ý |
|---|---|---|
| **Dataset AI (Giai đoạn 6)** | Dataset lửa/khói chất lượng cao khó thu thập | Ưu tiên FireNet, VisiFire; dự phòng +1 tuần |
| **Phần cứng camera server** | TensorRT yêu cầu GPU NVIDIA | Xác định phần cứng trước Giai đoạn 6; plan B: ONNX Runtime |
| **Latency SLA** | Chưa định nghĩa thời gian phản hồi chấp nhận được | Đề xuất: cảnh báo đến user ≤ 10 giây kể từ khi phát hiện |
| **RTSP Security** | JWT bảo vệ API nhưng RTSP streams có thể bị nghe lén | Camera streams nên trong VLAN riêng, không expose ra internet |
| **Real-time Frontend** | SSE vs WebSocket cần quyết định sớm | Dùng SSE trước (đơn giản hơn), upgrade WebSocket nếu cần |

### 📈 Đánh giá Tổng thể

| Tiêu chí | Điểm (1–5) |
|---|---|
| Tính đầy đủ thành phần kiến trúc | ⭐⭐⭐⭐⭐ |
| Tính thực tế của timeline | ⭐⭐⭐⭐ |
| Mức độ chi tiết kỹ thuật | ⭐⭐⭐⭐⭐ |
| Quản lý rủi ro | ⭐⭐⭐⭐ |
| **Khả năng thành công tổng thể** | **⭐⭐⭐⭐⭐ (Rất cao)** |

> **Kết luận:** 7-layer architecture hoàn chỉnh. **Timeline dự kiến: 16 tuần**, trong đó 2–3 tuần Shadow Testing nằm trong Giai đoạn 8.