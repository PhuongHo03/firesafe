# 🔥 FireSafe — Project Roadmap & Context

> **Dành cho AI Agent:** File này vừa là lộ trình kỹ thuật, vừa là context để tiếp tục làm việc ở session mới.
> Đọc phần **"📍 Trạng thái hiện tại"** và **"🔜 Việc tiếp theo"** trước, sau đó đọc explanation file của giai đoạn cần làm việc.

---

## 📍 Trạng thái hiện tại

| | |
|---|---|
| **Giai đoạn đang thực hiện** | 🔄 Giai đoạn 6 — Phát triển & Tối ưu AI Model |
| **Giai đoạn tiếp theo** | ⏳ Giai đoạn 7 — Giám sát Hệ thống |
| **Workspace root** | `d:\firesafe\` |

## 🔜 Việc tiếp theo cần làm (Giai đoạn 6)

- [x] Khởi tạo `ai-worker/` với YOLO video detection MVP
- [x] Tải model `.pt` vào `ai-worker/models/`
- [x] Chạy thử với video local và kiểm tra output bounding box
- [x] Mở rộng AI Worker thành module nhỏ + hỗ trợ upload MinIO + `POST /api/v1/alerts`
- [x] Thêm `setup.ps1 up/down/clean` để quản lý runtime local, tự chọn port trống, logs và `.runtime/ports.env`; `down`/`clean` đều xóa `.runtime/`
- [x] Chạy E2E thật với AI Worker service, backend, MinIO, Redis, RabbitMQ
- [x] Mở rộng sang RTSP camera preview + detect realtime trên UI `/cameras`
- [x] Tách CLI video local sang `video-detect/`, không backend/MinIO/auth/alert
- [x] AI Worker chạy song song preview thread + detect thread để stream không bị YOLO chặn
- [ ] Tune confidence/model runtime cho camera thật
- [ ] Bổ sung metrics/monitoring cho AI Worker ở Giai đoạn 7

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
                             │ Zalo ZNS/Telegram│
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
d:\firesafe\
│
├── docs/
│   ├── plannings/
│   │   └── planning.md                    ← File này
│   └── explanations/
│       ├── backend-explanation.md         ← Giải thích toàn bộ backend/
│       ├── infrastructure-explanation.md  ← Giải thích docker-compose.dev.yml
│       ├── mock-worker-explanation.md     ← Giải thích mock-worker/
│       ├── frontend-explanation.md        ← Giải thích frontend/ (Next.js)
│       └── ai-worker-explanation.md       ← Giải thích ai-worker/ RTSP preview + YOLO detect realtime
│
├── .agents/rules/
│   ├── andrej-karpathy-skills.md          ← Quy tắc viết code
│   ├── update-explanation.md              ← Rule cập nhật explanation
│   └── update-planning.md                 ← Rule cập nhật planning
│
├── backend/                               ← Spring Boot (Java 21, Maven)
│   ├── pom.xml
│   └── src/...
│
├── mock-worker/                           ← Python E2E test suite (Giai đoạn 4)
│   ├── mock_worker.py
│   └── requirements.txt
│
├── ai-worker/                             ← YOLO RTSP service chính (host process)
│   ├── service.py                         ← HTTP API: start/stop/status/MJPEG stream
│   ├── requirements.txt
│   ├── src/
│   │   ├── camera_worker.py               ← RTSP reader thread + YOLO detector thread
│   │   ├── backend_client.py              ← Login backend + POST alert
│   │   ├── storage.py                     ← Upload snapshot MinIO
│   │   ├── snapshot.py                    ← Encode frame PNG
│   │   └── config.py                      ← Model path config
│   └── models/                            ← Đặt wildfire-smoke-fire.pt hoặc best.pt sau khi tải model
│
├── video-detect/                          ← CLI debug video/image offline, tách khỏi AI Worker service
│   ├── detect_video.py
│   ├── requirements.txt
│   ├── src/
│   ├── models/
│   └── runs/
│
├── frontend/                              ← Next.js 16 (TypeScript, Tailwind)
│   ├── src/app/
│   │   ├── page.tsx                       ← Dashboard (danh sách alert)
│   │   ├── login/page.tsx                 ← Trang đăng nhập
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
│   └── .env.local                         ← NEXT_PUBLIC_API_URL
│
├── setup.ps1                              ← Runtime manager: up/down/clean infra + backend + frontend
├── run-mock-worker.ps1                    ← Script chạy mock-worker bằng mock-worker/venv
└── docker-compose.dev.yml                 ← 6 service: MariaDB, Redis, RabbitMQ,
                                             MinIO, Adminer, RedisInsight
```

---

## 🔑 Thông tin kết nối (Dev Local)

| Service | URL / Port | Credentials |
|---|---|---|
| Spring Boot API | `http://localhost:<BACKEND_PORT>` | — |
| Swagger UI | `http://localhost:<BACKEND_PORT>/swagger-ui.html` | `admin` / `admin123` |
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
| **Worker** | Spring AMQP Consumer | Consume queue → gửi Zalo ZNS / Telegram |
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
| `roles` | `id`, `name` (`ROLE_ADMIN`, `ROLE_OPERATOR`, `ROLE_VIEWER`) |
| `user_roles` | `user_id`, `role_id` |

#### Định nghĩa API Contract

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Lấy JWT token |
| `POST` | `/api/v1/alerts` | JWT Bearer | AI Worker gửi cảnh báo mới |
| `GET` | `/api/v1/alerts` | JWT Bearer | Danh sách cảnh báo (phân trang) |
| `GET` | `/api/v1/alerts/{id}` | JWT Bearer | Chi tiết một cảnh báo |
| `GET` | `/api/v1/cameras` | JWT Bearer | Danh sách camera |
| `POST` | `/api/v1/cameras` | JWT + ADMIN | Thêm camera mới |
| `PUT` | `/api/v1/cameras/{id}` | JWT + ADMIN | Cập nhật thông tin camera |
| `DELETE` | `/api/v1/cameras/{id}` | JWT + ADMIN | Xóa camera |
| `GET` | `/api/v1/users` | JWT + ADMIN | Quản lý người dùng |

**Payload mẫu AI Worker gửi về (`POST /api/v1/alerts`):**
```json
{
  "camera_id": 1,
  "confidence": 0.91,
  "label": "fire",
  "image_url": "http://minio:9000/snapshots/cam-001/2026-04-22T10-30-00.jpg",
  "detected_at": "2026-04-22T10:30:00Z"
}
```

---

### ✅ Giai đoạn 2 — Backend Core *(Tuần 3–4)*

> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [`docs/explanations/backend-explanation.md`](../explanations/backend-explanation.md) để hiểu toàn bộ cấu trúc, luồng dữ liệu và chức năng từng file trong `backend/`.

**Mục tiêu:** Backend skeleton hoàn chỉnh, API hoạt động đầy đủ, test được độc lập không cần AI hay Frontend.

**Những gì đã làm:**
- Spring Boot 3.5 + Maven, Java 21
- Flyway migrations: `V1__init_schema.sql` (5 bảng + indexes), `V2__seed_data.sql` (roles, admin, camera test)
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
- Default admin: `admin` / `admin123`
- JWT secret phải thay bằng key dài hơn khi deploy production
- `NotificationWorker` có TODO — chờ tích hợp Zalo/Telegram ở Giai đoạn 3

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
- Zalo ZNS có thể bổ sung sau bằng cách tạo `ZaloNotificationService` tương tự

---

### ✅ Giai đoạn 4 — Mock AI Worker & End-to-End Test *(Tuần 7)*

> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [`docs/explanations/mock-worker-explanation.md`](../explanations/mock-worker-explanation.md).

**Những gì đã làm:**
- `mock-worker/mock_worker.py` — E2E test suite 5 test case:
  - Test 1: JWT login (`admin`/`admin123`) → nhận token
  - Test 2: Tạo ảnh PNG giả bằng Pillow → upload MinIO → lấy URL
  - Test 3: `POST /api/v1/alerts` → verify alert trong DB qua `GET /api/v1/alerts/{id}`
  - Test 4: Gửi 10 alerts liên tiếp → verify Redis debounce (chỉ 1 notification)
  - Test 5: `GET /api/v1/cameras` → verify camera API
- Hỗ trợ chạy từng test riêng: `--test minio|pipeline|debounce`

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
- **Dashboard** (`/`) — bảng alert phân trang, auto-refresh 30s, click vào detail
- **Alert Detail** (`/alerts/[id]`) — ảnh hiện trường, thông tin đầy đủ
- **Cameras** (`/cameras`) — card grid camera, thêm/xóa (chỉ ADMIN)
- **Sidebar** — navigation chung, logout, hiển thị username/role
- `.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:8080`

**Chạy frontend:**
```powershell
cd frontend
npm run dev   # http://localhost:3000
```

---

### 🔄 Giai đoạn 6 — Phát triển & Tối ưu AI Model *(Tuần 10–13)*

> **Trạng thái: ĐANG THỰC HIỆN**
> **Context cho session mới:** Đọc [`docs/explanations/ai-worker-explanation.md`](../explanations/ai-worker-explanation.md) để hiểu MVP detect video local bằng YOLO.

**Mục tiêu:** Xây dựng AI Worker thật thay thế Mock, kết nối vào backend đã ổn định.

**Quyết định hiện tại:** Dùng pretrained model `odiug77/wildfire-smoke-fire` từ Hugging Face để test nhận diện luôn, chưa training lại ở bước đầu.

**Những gì đã làm:**
- Tách `video-detect/` thành CLI debug video/image offline riêng, chỉ dùng `--source`, `--model`, `--conf`, `--show`, `--save`.
- Giữ `ai-worker/` là HTTP service chính cho RTSP preview, detect realtime và gửi alert.
- Tách AI Worker service thành các module: `config.py`, `camera_worker.py`, `snapshot.py`, `storage.py`, `backend_client.py`.
- `camera_worker.py` hiện tách 2 thread: RTSP reader cập nhật MJPEG preview liên tục, YOLO detector lấy frame mới nhất theo interval để detect/alert.
- Thêm guard chống spam camera: bấm Start nhiều lần không tạo thêm RTSP session; reconnect backoff 5s → 10s → 20s → 30s.
- Thêm backend `DemoCameraSeeder` đọc `backend/.env.local` để seed camera RTSP demo khi `FIRESAFE_DEMO_CAMERA_RTSP_URL` khác rỗng.
- Thêm dependencies service `ultralytics`, `opencv-python`, `requests`, `minio`.
- Thêm `setup.ps1` để chạy/dừng/dọn runtime local, tự chọn port trống, lưu log vào `.runtime/logs/` và port vào `.runtime/ports.env`.
- `setup.ps1 up` quản lý AI Worker như host service, inject `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_AI_WORKER_URL` cho frontend; `run-ai-worker.ps1` đã được thay thế.
- Cập nhật `/cameras`: nhập RTSP URL, Start/Stop Detect, MJPEG preview lớn hơn, delete camera xử lý đúng response `204 No Content`.
- Fix hydration/token issues bằng cách đọc cookie auth sau mount trong `useEffect`.
- Tạo/cập nhật `docs/explanations/ai-worker-explanation.md`.

#### 6a. MVP nhận diện video local *(Hoàn thành bước đầu)*
- [x] Chuẩn bị script load YOLO `.pt` bằng Ultralytics.
- [x] Nhận input video/image bằng `--source`.
- [x] Hỗ trợ `--conf`, `--show`, `--save`.
- [x] Tải model `.pt` vào `video-detect/models/` hoặc truyền `--model`.
- [x] Chạy thử với video local và kiểm tra bounding box.
- [x] Tách CLI local sang `video-detect/`, không backend/MinIO/auth/alert.

#### 6b. Tích hợp backend sau khi model chạy ổn *(Đang làm)*
- [x] Upload snapshot lên MinIO.
- [x] Login backend lấy JWT.
- [x] POST `/api/v1/alerts` với `cameraId`, `label`, `confidence`, `imageUrl`, `detectedAt`.
- [x] Dùng Redis debounce/RabbitMQ notification sẵn có ở backend.
- [x] Chạy E2E thật qua AI Worker service và xác nhận alert xuất hiện trong DB/frontend.

#### 6c. RTSP realtime service *(Đang làm/tune)*
- [x] Đọc RTSP bằng OpenCV/FFmpeg backend.
- [x] Preview MJPEG realtime trên UI `/cameras`.
- [x] Start/Stop detect theo từng camera từ UI.
- [x] Tách preview thread khỏi detect thread để stream không bị YOLO chặn.
- [x] Upload snapshot MinIO + POST alert backend khi detect fire/smoke.
- [x] Chống spam reconnect/start để tránh camera block.
- [ ] Tune `--conf`, detection interval, resolution/FPS theo camera thật.
- [ ] Đo FPS/latency thực tế sau khi camera chạy ổn định.

#### 6d. Tối ưu production sau MVP
- Export ONNX; nếu có GPU NVIDIA thì cân nhắc TensorRT.
- Benchmark FPS/latency, đảm bảo SLA ≤ 10 giây end-to-end.
- Expose metrics GPU/FPS/RTSP status cho Prometheus.

---

### ⏳ Giai đoạn 7 — Giám sát Hệ thống *(Tuần 14)*

> **Trạng thái: CHƯA BẮT ĐẦU**

**Mục tiêu:** Hệ thống "sống" 24/7 và tự báo cáo "sức khỏe".

#### Thu thập Metrics
- **Backend:** Actuator + Micrometer → `/actuator/prometheus` (đã cấu hình sẵn)
- **AI Worker:** HTTP endpoint Python → GPU temp, VRAM, FPS, RTSP status
- **Nginx:** `nginx-prometheus-exporter`

#### Grafana Dashboards
- Alert rate theo thời gian (per camera)
- FPS model theo từng AI Worker
- Queue depth RabbitMQ
- Uptime của từng service
- GPU VRAM & nhiệt độ

---

### ⏳ Giai đoạn 8 — Containerization & Shadow Testing *(Tuần 15–16)*

> **Trạng thái: CHƯA BẮT ĐẦU**

**Mục tiêu:** Đóng gói hoàn chỉnh, chạy thử thực địa trước khi go-live.

#### Docker Compose Stack (Production)
```yaml
services:
  nginx:        # API Gateway + Reverse Proxy
  frontend:     # Next.js
  api:          # Spring Boot
  ai-worker:    # Python AI Worker
  mariadb:      # Database
  redis:        # Cache/Debounce
  minio:        # Object Storage
  rabbitmq:     # Message Broker
  prometheus:   # Metrics collection
  grafana:      # Visualization
```

#### Shadow Testing (2–3 tuần song song)
- Chạy hệ thống **song song** với hệ thống báo cháy vật lý hiện tại
- **Không** dùng làm nguồn cảnh báo chính thức trong giai đoạn này
- Đo lường: latency end-to-end, False Positive/Negative rate, uptime
- Kết quả → quyết định go-live

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