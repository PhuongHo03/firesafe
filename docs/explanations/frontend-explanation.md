# 🌐 Frontend — Giải thích Next.js App

> Giao diện người dùng cho đội vận hành theo dõi và quản lý hệ thống cảnh báo cháy.

---

## 📁 Cấu trúc thư mục

```
frontend/
│
├── Dockerfile                  ← Build Next.js image cho Docker Compose
│
└── src/
    ├── app/                    ← App Router (Next.js 16), route files mỏng
    │   ├── layout.tsx          ← Root layout (font Inter, metadata SEO)
    │   ├── globals.css         ← CSS Variables (dark theme)
    │   ├── page.tsx            ← Route `/` → redirect `/cameras`
    │   ├── dashboard/page.tsx  ← Route `/dashboard` → DashboardScreen
    │   ├── login/page.tsx      ← Route `/login` → LoginScreen
    │   ├── register/page.tsx   ← Route `/register` → RegisterScreen
    │   ├── alerts/page.tsx     ← Route `/alerts` → AlertsScreen
    │   ├── alerts/[id]/page.tsx← Route `/alerts/[id]` → AlertDetailScreen
    │   ├── cameras/page.tsx    ← Route `/cameras` → CamerasScreen
    │   ├── cameras/[id]/page.tsx← Route `/cameras/[id]` → CameraDetailScreen
    │   ├── logs/page.tsx       ← Route `/logs` → LogsScreen
    │   └── admin/users/page.tsx← Route `/admin/users` → AdminUsersScreen
    │
    ├── features/               ← Feature-based layered modules
    │   ├── auth/               ← api/components/dtos/hooks/screens/states/types
    │   ├── alerts/             ← api/components/dtos/hooks/screens/states/types
    │   ├── cameras/            ← api/components/dtos/hooks/screens/states/types
    │   ├── dashboard/          ← components/dtos/hooks/screens/states/types
    │   ├── monitoring/         ← api/dtos/hooks/states/types
    │   ├── logs/               ← api/hooks/screens/types
    │   └── admin-users/        ← api/components/dtos/hooks/screens/states/types
    │
    ├── layouts/
    │   └── Sidebar.tsx         ← Navigation/sidebar shell dùng chung
    │
    └── shared/
        └── utils/
            ├── http.ts         ← HTTP request helpers + public base URLs
            └── auth.ts         ← JWT cookie helpers
```

---

## 📌 Lưu ý về cấu trúc

- `node_modules/` và `.next/` là generated folders: `npm install`/Next dev server có thể tạo lại, không xem là source of truth.
- `public/`, `.gitignore`, `AGENTS.md`, `CLAUDE.md` và các file cấu hình sinh sẵn/metadata khác không được liệt kê trong cây vì không phải luồng logic chính của frontend.

---

## 🚀 Cách chạy

### Docker Compose full stack — workflow chính Giai đoạn 8

Từ project root:

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

Mở UI qua Nginx:

```text
http://localhost:<NGINX_PORT>
```

Mặc định:

```text
http://localhost:3000
```

Trong Docker Compose, frontend image được build với `NEXT_PUBLIC_API_URL` để trống. Browser gọi same-origin qua Nginx:

```text
/api/v1/...               -> backend
/api/admin/metrics        -> backend (Prometheus internal)
/api/admin/worker/...     -> backend gateway tới AI Worker nội bộ
```

### Chạy thủ công frontend từ source

```powershell
cd frontend
npm run dev     # Dev server: http://localhost:3000
npm run build   # Build production
npm start       # Chạy production build
```

---

## 🔧 Cấu hình

Prefix `NEXT_PUBLIC_` bắt buộc để biến được expose ra phía client (browser). Docker Compose để `NEXT_PUBLIC_API_URL` trống trong root `.env`, nên frontend gọi same-origin qua Nginx (`/api/v1`, `/api/admin`). Vì Next.js bake `NEXT_PUBLIC_*` vào bundle lúc build, đổi public URL/port thì cần rebuild frontend image. Nếu đặt explicit URL, URL đó phải browser truy cập được, không dùng tên service nội bộ như `http://backend:8080`.

---

## 📚 Giải thích các file

### `src/shared/utils/http.ts` + `src/features/*/api/` — API Layer

`src/shared/utils/http.ts` chỉ giữ request helper dùng chung (`request`) và base URL public. API theo nghiệp vụ nằm trong từng feature (`features/auth/api`, `features/alerts/api`, `features/cameras/api`, `features/monitoring/api`, `features/admin-users/api`). Nếu `NEXT_PUBLIC_API_URL` không được set, base URL là chuỗi rỗng để request đi same-origin qua Nginx:

```text
/api/v1/...               -> backend
/api/admin/metrics        -> backend (Prometheus internal)
/api/admin/worker/...     -> backend gateway tới worker
```

Các method chính theo feature:

```ts
authApi.login(username, password)              // → { token, username, roles }
authApi.register(username, email, password)    // → AuthResponse
alertsApi.getAlerts(page, size, token, cameraId?) // → { content: Alert[], totalElements, totalPages }
alertsApi.getAlert(id, token)                  // → Alert
alertsApi.deleteAlert(id, token)               // → void
alertsApi.deleteAllAlerts(token)               // → void
camerasApi.getCameras(token)                   // → Camera[]
camerasApi.getCamera(id, token)                // → Camera
camerasApi.createCamera(data, token)           // → Camera
camerasApi.deleteCamera(id, token)             // → void
camerasApi.startCameraDetection(cameraId, token) // → backend gateway → worker
camerasApi.stopCameraDetection(cameraId, token) // → backend gateway → worker
camerasApi.getCameraDetectionStatus(cameraId, token) // → backend gateway → worker
camerasApi.getCameraStreamUrl(cameraId)        // → backend MJPEG stream URL
camerasApi.checkDetectionCapacity(token)       // → { allowed: boolean, reason?: string }
camerasApi.reserveCameraPreview(cameraId, token) // → PreviewReservation
camerasApi.keepAliveCameraPreview(cameraId, token) // → PreviewReservation
camerasApi.releaseCameraPreview(cameraId, token) // → PreviewReservation
camerasApi.getMyPreviewReservations(token)     // → PreviewReservationsResponse
monitoringApi.getDashboardMetrics(token)       // → backend GET /api/admin/metrics (15s auto-refresh)
logsApi.getWorkerMonitoringSummary(token)      // → backend GET /api/admin/worker/monitoring/summary (2s auto-refresh)
usersApi.getUsers(token)                       // → UserAccount[]
usersApi.updateUser(id, data, token)           // → UserAccount
```

**TypeScript Interfaces:**

```ts
interface Alert {
  id: number;
  cameraId: number;
  cameraName: string;
  label: string;          // "fire" | "smoke"
  confidence: number;     // 0.0 → 1.0
  imageUrl: string;
  detectedAt: string;     // ISO 8601
  status: string;         // "NEW" | "PROCESSED"
}

interface Camera {
  id: number;
  name: string;
  rtspUrl: string;
  location: string;
  active: boolean;
}

interface CameraDetectionStatus {
  cameraId: number;
  running: boolean;
  error: string | null;
  lastAlertAt?: string | null;
  hasFrame?: boolean;
}

interface PreviewReservation {
  reserved: boolean;
  cameraId: number;
  ttlSec: number;
  keepaliveSec: number;
  reason: string | null;
}
```

---

### `src/shared/utils/auth.ts` — JWT Auth Helper

Lưu JWT và thông tin user vào cookie bằng `js-cookie`. Đây là client-side cookie để frontend đọc được token khi gọi API:

```ts
saveAuth({ token, username, roles })  // Lưu vào cookie, expires: 1 ngày
getToken()                            // Lấy token hiện tại
getUser()                             // Lấy { username, roles }
clearAuth()                           // Xóa cookie khi logout
isAdmin()                             // Kiểm tra có ROLE_ADMIN không
```

---

### `src/features/*/` — Feature Layer

Mỗi feature sở hữu logic theo lớp riêng:

- `api/`: backend/worker/monitoring endpoint functions theo nghiệp vụ.
- `components/`: UI presentational nội bộ feature (form, table, cards, charts).
- `dtos/`: form/request/view mapping, validation nhẹ, formatter theo feature.
- `hooks/`: orchestration loading/error/reload/redirect/submit/polling.
- `screens/`: route-level composition; `src/app/**/page.tsx` chỉ import screen.
- `states/`: constants, initial state, state transition helpers.
- `types/`: TypeScript compile-time contracts.

Ví dụ: `app/cameras/page.tsx` → `features/cameras/screens/CamerasScreen.tsx` → `hooks/useCameras`, `hooks/useCameraDetection`, `components/CameraGrid`, `dtos/cameraDto`, `states/cameraState`.

`dashboard` không có `api/` riêng vì nó compose `alerts` + `monitoring`; `monitoring` không có `screens/`/`components/` vì UI được render trong dashboard components.

---

### `src/layouts/Sidebar.tsx` — Navigation

Navigation sidebar dùng chung cho tất cả trang (trừ Login). Hiển thị:
- Logo + brand name
- Admin thấy Dashboard, Users, Alerts, Cameras, Logs; Viewer chỉ thấy Alerts và Cameras
- Username + role của người đang đăng nhập (`Admin` hoặc `Viewer`)
- Nút Đăng xuất (xóa cookie → redirect `/login`)

---

## 🗺️ Các trang

### `/login` — Trang đăng nhập

- Form đơn giản: email `@nhattienchung.vn` + password
- Gọi `POST /api/v1/auth/login` → nhận JWT
- Lưu token bằng `saveAuth()` → redirect về `/`
- Có link sang `/register`
- Hiển thị lỗi nếu sai credentials

### `/register` — Đăng ký viewer

- Form: tên tài khoản hiển thị, email, password, xác nhận password
- Client validate email phải kết thúc bằng `@nhattienchung.vn`
- Client validate password xác nhận khớp
- Gọi `POST /api/v1/auth/register` → tạo tài khoản `ROLE_VIEWER` ở trạng thái pending; email/tên tài khoản không được trùng
- Không auto-login vì tài khoản chưa active; ở lại trang đăng ký và hiển thị thông báo chờ Ban quản trị kích hoạt
- Admin phải vào `/admin/users` kích hoạt trước khi user login được
- Không có chọn role khi đăng ký

### `/` — Home redirect

Route `/` redirect sang `/cameras` để Viewer đăng nhập xong vào thẳng trang được phép xem. Dashboard chuyển sang `/dashboard`.

### `/dashboard` — Dashboard

| Tính năng | Mô tả |
|---|---|
| Infra metrics đầu trang | MariaDB, MinIO, Redis, RabbitMQ status + dung lượng/số lượng chính |
| Cards monitoring | Backend status, AI Worker status, camera active/total, tổng alert |
| System metrics | CPU %, RAM/Disk dạng used/total lấy từ backend `/api/admin/metrics` dựa trên Prometheus/node-exporter; GPU hiển thị `N/A` nếu chưa có GPU exporter |
| API metrics | API latency/error/request count lấy từ backend-normalized Prometheus metrics |
| Alert charts | Alerts theo giờ và theo loại lấy từ backend admin metrics/business data |
| AI Worker runtime | Bảng camera đang detect: running, hasFrame, detections, alerts, inference ms |
| Bảng mới nhất | Hiển thị 5 alert mới nhất, không có nút xóa |
| Auto-refresh | Tự động tải lại metrics mỗi 15 giây, alerts mỗi 30 giây |
| Click vào row | Chuyển sang trang chi tiết `/alerts/[id]` |
| Xem tất cả | Chuyển sang `/alerts` để quản lý danh sách đầy đủ |

### `/alerts` — Danh sách Alert

Hiển thị danh sách alert đầy đủ với phân trang, auto-refresh, click row để vào chi tiết, nút "Xóa" từng cảnh báo và nút "Xóa tất cả" cạnh "Làm mới".

### `/admin/users` — Quản lý người dùng

Chỉ Admin truy cập được. Trang này hiển thị danh sách tài khoản, bật/tắt active và chỉnh role giữa `ROLE_ADMIN` / `ROLE_VIEWER`. Tài khoản mới đăng ký mặc định là Viewer pending; Admin phải active thì user mới đăng nhập được.

### `/alerts/[id]` — Chi tiết Alert

Hiển thị:
- Ảnh snapshot từ MinIO (nếu có); frontend render `GET /api/v1/alerts/{id}/image`, backend đọc MinIO nội bộ và trả ảnh sau khi JWT hợp lệ
- Tên camera, loại cảnh báo, độ tin cậy, thời gian, trạng thái
- Link URL ảnh gốc để truy cập trực tiếp
- Nút "Xóa" chỉ hiện với Admin để xóa alert hiện tại rồi quay về `/alerts`

### `/cameras` — Quản lý Camera

| Quyền | Tính năng |
|---|---|
| Mọi user | Xem danh sách camera (card grid) |
| Mọi user | Xem trạng thái detect từ AI Worker |
| ADMIN | Start/Stop Detect cho từng camera qua AI Worker |
| Mọi user | Mở/ẩn stream UI qua preview reservation |
| ADMIN | Nút "Thêm Camera" — form thêm mới |
| ADMIN | Nút "Xóa" trên từng card |

Form thêm camera yêu cầu: Tên, Vị trí, RTSP URL.

Flow detection + preview:

1. Admin bấm **Start Detect** → frontend kiểm tra detection capacity (`GET /api/v1/detection/capacity`): CPU < `DETECTION_CPU_THRESHOLD`, GPU < `DETECTION_GPU_THRESHOLD`
2. Nếu capacity pass → gọi backend `/api/v1/cameras/{id}/detection/start`; backend lấy RTSP URL từ DB và gọi worker nội bộ. Worker chờ RTSP connect + first frame tối đa 8s rồi trả về status thực tế (`running`, `hasFrame`, `error`).
3. Nếu RTSP fail → UI hiện **"khối lỗi"** + nút Stop. Worker không chạy detection.
4. Nếu RTSP OK + có frame → card hiện nút **Mở stream** cho mọi user đã đăng nhập thay vì tự render MJPEG.
5. Bấm **Mở stream** → backend kiểm tra preview capacity (`POST /api/v1/cameras/{id}/preview/reserve`): CPU < `PREVIEW_CPU_THRESHOLD`. Request preview này pass với ADMIN/VIEWER, nhưng vẫn bị chặn nếu hệ thống quá tải.
6. Preview pass → card render MJPEG và gửi keepalive định kỳ. Preview fail → UI hiện lý do từ backend, detection vẫn chạy.

Camera có 4 trạng thái: Chưa detect → Đang kết nối → Lỗi → Đang detect (+ stream hoặc quá tải). Nếu đang chạy OK rồi RTSP đứt → worker tự reconnect (exponential backoff 5s→30s), detection tạm dừng rồi tự resume.

Nút **Stop** luôn hiện khi camera đã từng được Start Detect (dù đang lỗi hay đang detect). Khi bấm Stop, UI giữ trạng thái **Đang dừng...** tối thiểu `CAMERA_STOP_MIN_BUSY_MS = 600ms` để tránh nút chớp ngược về Stop trước khi về Start Detect. Nút **Start Detect** chỉ hiện khi camera chưa start / đã stop hẳn.

Mỗi card camera có thể bấm để vào `/cameras/[id]` bất kể preview đang bật hay chưa. Các nút thao tác như **Mở stream**, **Ẩn preview**, **Start Detect**, **Stop**, **Xóa** vẫn hoạt động riêng và không tự chuyển trang.

### `/cameras/[id]` — Chi tiết Camera

Trang chi tiết camera luôn mở được từ card camera:

- Load thông tin camera (`GET /api/v1/cameras/{id}`), status worker, preview reservations của user và tối đa 50 alert mới nhất của camera.
- Chỉ render stream lớn nếu reservation của user hiện tại còn sống, worker `running`, `hasFrame=true` và không có `error`; nếu chưa có preview thì trang vẫn hiện thông tin camera, total alerts và danh sách alert.
- Gửi keepalive định kỳ theo `keepaliveSec`; nếu reservation hết hạn thì stream bị tắt và hiện lỗi.
- Bên dưới stream hiển thị name/hãng camera, location, total alerts.
- Có dropdown và list nhỏ các alert của camera; bấm vào alert chuyển tới `/alerts/[id]`.

### `/logs` — Runtime Logs

Trang `/logs` hiển thị snapshot mới nhất từ backend `GET /api/admin/worker/monitoring/summary` với auto-refresh mỗi 2 giây. Backend đọc AI Worker nội bộ, nên worker runtime không bị public qua Nginx. Trang này thay cho lệnh PowerShell polling monitoring summary, nhưng render dạng structured cards/table thay vì raw JSON.

Nội dung chính:

- Worker status, số camera worker đang detect, số shared RTSP sources.
- Inference scheduler: running, registered cameras, max batch size, max wait, tổng batches, tổng frames inferred, average batch size, average inference ms, tổng errors.
- Camera runtime table: camera ID, running, has frame, detections total, alerts total, average inference, last alert, error.
- Value explanations hiển thị trực tiếp trong UI theo bố cục `giá trị hiện tại | ý nghĩa`.

Trang `/logs` không lưu database/localStorage/sessionStorage. Đây là runtime latest snapshot trong React state; lịch sử metrics dài hạn vẫn thuộc Prometheus, business alerts vẫn thuộc MariaDB.

---

## 🎨 Design System

CSS Variables được định nghĩa trong `globals.css`:

| Variable | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `#0f1117` | Nền trang |
| `--surface` | `#1a1d27` | Card, sidebar, table |
| `--surface-2` | `#242736` | Input, hover |
| `--border` | `#2e3347` | Đường viền |
| `--accent` | `#ef4444` | Màu chủ đạo (đỏ lửa) |
| `--accent-dim` | `rgba(239,68,68,0.15)` | Background badge lửa |
| `--text` | `#e2e8f0` | Chữ chính |
| `--text-muted` | `#64748b` | Chữ phụ, label |
| `--green` | `#22c55e` | Trạng thái an toàn |
| `--yellow` | `#f59e0b` | Cảnh báo trung bình |

---

## 📦 Dependencies

| Package | Mục đích |
|---|---|
| `next@16` | Framework React với App Router |
| `react@19` / `react-dom@19` | React runtime |
| `tailwindcss` | CSS tooling qua Tailwind v4/PostCSS; UI hiện chủ yếu dùng inline style + CSS variables |
| `lucide-react` | Icon library (Flame, Camera, LogOut, Play, Square...) |
| `js-cookie` | Đọc/ghi cookie phía client |
| `@types/js-cookie` | TypeScript types cho js-cookie |

---

*Tài liệu phản ánh trạng thái frontend tại **Giai đoạn 9**. Frontend dùng cấu trúc feature-based (`src/app` route mỏng → `src/features/*/screens` → hooks/API/types theo feature), có login/register viewer-pending-activation (`@nhattienchung.vn`), `/admin/users` để Admin kích hoạt/chỉnh role, `/` redirect sang `/cameras`, Dashboard tổng quan gọi backend `/api/admin/metrics` để nhận Prometheus/business metrics đã normalize, trang `/alerts` quản lý danh sách/xóa alert theo quyền và render snapshot qua backend image gateway, trang `/cameras` tích hợp Worker RTSP detect + preview reservation qua backend gateway, Viewer chỉ thấy Alerts/Cameras ở sidebar nhưng vẫn xem được preview nếu reserve pass, trang `/cameras/[id]` xem stream lớn khi reservation còn sống, trang `/logs` hiển thị AI Worker runtime monitoring snapshot dạng cards/table, và có Dockerfile để build bằng root `.env`/Compose; WebSocket real-time sẽ bổ sung sau nếu cần.*
