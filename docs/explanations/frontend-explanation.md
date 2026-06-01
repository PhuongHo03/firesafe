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
    │   ├── page.tsx            ← Route `/` → DashboardScreen
    │   ├── login/page.tsx      ← Route `/login` → LoginScreen
    │   ├── register/page.tsx   ← Route `/register` → RegisterScreen
    │   ├── alerts/page.tsx     ← Route `/alerts` → AlertsScreen
    │   ├── alerts/[id]/page.tsx← Route `/alerts/[id]` → AlertDetailScreen
    │   ├── cameras/page.tsx    ← Route `/cameras` → CamerasScreen
    │   └── admin/users/page.tsx← Route `/admin/users` → AdminUsersScreen
    │
    ├── features/               ← Feature-based layered modules
    │   ├── auth/               ← api/components/dtos/hooks/screens/states/types
    │   ├── alerts/             ← api/components/dtos/hooks/screens/states/types
    │   ├── cameras/            ← api/components/dtos/hooks/screens/states/types
    │   ├── dashboard/          ← components/dtos/hooks/screens/states/types
    │   ├── monitoring/         ← api/dtos/hooks/states/types
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
http://localhost:<FRONTEND_PORT>
```

Mặc định:

```text
http://localhost:3000
```

Trong Docker Compose, frontend image được build với `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_WORKER_URL`, `NEXT_PUBLIC_PROMETHEUS_URL` để trống. Browser gọi same-origin qua Nginx:

```text
/api/v1/...               -> backend
/api/cameras/...          -> AI Worker
/prometheus/api/v1/query  -> Prometheus
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

Prefix `NEXT_PUBLIC_` bắt buộc để biến được expose ra phía client (browser). Docker Compose để các giá trị `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_WORKER_URL`, `NEXT_PUBLIC_PROMETHEUS_URL` trống trong root `.env`, nên frontend gọi same-origin qua Nginx (`/api/v1`, `/api/cameras`, `/prometheus/api/v1/query`). Vì Next.js bake `NEXT_PUBLIC_*` vào bundle lúc build, đổi public URL/port thì cần rebuild frontend image. Nếu đặt explicit URL, URL đó phải browser truy cập được, không dùng tên service nội bộ như `http://backend:8080`.

---

## 📚 Giải thích các file

### `src/shared/utils/http.ts` + `src/features/*/api/` — API Layer

`src/shared/utils/http.ts` chỉ giữ request helpers dùng chung (`request`, `requestAI`, `requestPrometheus`) và base URL public. API theo nghiệp vụ nằm trong từng feature (`features/auth/api`, `features/alerts/api`, `features/cameras/api`, `features/monitoring/api`, `features/admin-users/api`). Nếu `NEXT_PUBLIC_*` không được set, base URL là chuỗi rỗng để request đi same-origin qua Nginx:

```text
/api/v1/...               -> backend
/api/cameras/...          -> worker
/prometheus/api/v1/query  -> Prometheus
```

Các method chính theo feature:

```ts
authApi.login(username, password)              // → { token, username, roles }
authApi.register(username, email, password)    // → AuthResponse
alertsApi.getAlerts(page, size, token)         // → { content: Alert[], totalElements, totalPages }
alertsApi.getAlert(id, token)                  // → Alert
alertsApi.deleteAlert(id, token)               // → void
alertsApi.deleteAllAlerts(token)               // → void
camerasApi.getCameras(token)                   // → Camera[]
camerasApi.createCamera(data, token)           // → Camera
camerasApi.deleteCamera(id, token)             // → void
camerasApi.startCameraDetection(camera)        // → CameraDetectionStatus
camerasApi.stopCameraDetection(cameraId)       // → CameraDetectionStatus
camerasApi.getCameraDetectionStatus(cameraId)  // → CameraDetectionStatus
camerasApi.getCameraStreamUrl(cameraId)        // → MJPEG stream URL
monitoringApi.getDashboardMetrics()            // → Query Prometheus và map thành DashboardMetrics
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
- Link Dashboard, Alerts, Cameras với highlight trang hiện tại
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

### `/register` — Đăng ký admin

- Form: tên tài khoản hiển thị, email, password, xác nhận password
- Client validate email phải kết thúc bằng `@nhattienchung.vn`
- Client validate password xác nhận khớp
- Gọi `POST /api/v1/auth/register` → tạo tài khoản `ROLE_VIEWER` ở trạng thái pending; email/tên tài khoản không được trùng
- Không auto-login vì tài khoản chưa active; ở lại trang đăng ký và hiển thị thông báo chờ Ban quản trị kích hoạt
- Admin phải vào `/admin/users` kích hoạt trước khi user login được
- Không có chọn role khi đăng ký

### `/` — Dashboard

| Tính năng | Mô tả |
|---|---|
| Infra metrics đầu trang | MariaDB, MinIO, Redis, RabbitMQ status + dung lượng/số lượng chính |
| Cards monitoring | Backend status, AI Worker status, camera active/total, tổng alert |
| System metrics | CPU %, RAM/Disk dạng used/total lấy từ Prometheus/node-exporter; GPU hiển thị `N/A` nếu chưa có GPU exporter |
| API metrics | API latency/error/request count lấy từ Prometheus backend metrics |
| Alert charts | Để trống nếu backend chưa export business metrics dạng Prometheus |
| AI Worker runtime | Bảng camera đang detect: running, hasFrame, detections, alerts, inference ms |
| Bảng mới nhất | Hiển thị 5 alert mới nhất, không có nút xóa |
| Auto-refresh | Tự động tải lại metrics mỗi 10 giây, alerts mỗi 30 giây |
| Click vào row | Chuyển sang trang chi tiết `/alerts/[id]` |
| Xem tất cả | Chuyển sang `/alerts` để quản lý danh sách đầy đủ |

### `/alerts` — Danh sách Alert

Hiển thị danh sách alert đầy đủ với phân trang, auto-refresh, click row để vào chi tiết, nút "Xóa" từng cảnh báo và nút "Xóa tất cả" cạnh "Làm mới".

### `/admin/users` — Quản lý người dùng

Chỉ Admin truy cập được. Trang này hiển thị danh sách tài khoản, bật/tắt active và chỉnh role giữa `ROLE_ADMIN` / `ROLE_VIEWER`. Tài khoản mới đăng ký mặc định là Viewer pending; Admin phải active thì user mới đăng nhập được.

### `/alerts/[id]` — Chi tiết Alert

Hiển thị:
- Ảnh snapshot từ MinIO (nếu có)
- Tên camera, loại cảnh báo, độ tin cậy, thời gian, trạng thái
- Link URL ảnh gốc để truy cập trực tiếp
- Nút "Xóa" chỉ hiện với Admin để xóa alert hiện tại rồi quay về `/alerts`

### `/cameras` — Quản lý Camera

| Quyền | Tính năng |
|---|---|
| Mọi user | Xem danh sách camera (card grid) |
| Mọi user | Xem trạng thái detect và MJPEG preview khi AI Worker đang chạy |
| ADMIN | Start/Stop Detect cho từng camera qua AI Worker |
| ADMIN | Nút "Thêm Camera" — form thêm mới |
| ADMIN | Nút "Xóa" trên từng card |

Form thêm camera yêu cầu: Tên, Vị trí, RTSP URL. Trang `/cameras` poll trạng thái AI Worker mỗi 10 giây, hiển thị lỗi RTSP nếu worker trả về `error`, và dùng `<img>` để render stream `/api/cameras/{id}/stream.mjpg` khi detect đang chạy. UI cho phép mở nhiều preview MJPEG; trước khi mở thêm preview sẽ query Prometheus qua `/prometheus/api/v1/query`, lấy mức tải cao nhất giữa CPU/RAM/GPU và chặn nếu ≥ 80% để tránh làm máy/Nginx/worker quá tải. Nếu worker đang lỗi/retry RTSP, UI vẫn hiện nút **Stop** để người dùng dừng worker thay vì hiện **Start Detect** gây spam start.

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

*Tài liệu phản ánh trạng thái frontend tại **Giai đoạn 9**. Frontend dùng cấu trúc feature-based (`src/app` route mỏng → `src/features/*/screens` → hooks/API/types theo feature), có login/register viewer-pending-activation (`@nhattienchung.vn`), `/admin/users` để Admin kích hoạt/chỉnh role, Dashboard tổng quan query Prometheus qua Nginx và map thành metrics UI, trang `/alerts` quản lý danh sách/xóa alert theo quyền, trang `/cameras` tích hợp Worker RTSP preview/detect realtime, và có Dockerfile để build bằng root `.env`/Compose; WebSocket real-time sẽ bổ sung sau nếu cần.*
