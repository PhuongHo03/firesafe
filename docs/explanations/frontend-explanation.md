# 🌐 Frontend — Giải thích Next.js App

> Giao diện người dùng cho đội vận hành theo dõi và quản lý hệ thống cảnh báo cháy.

---

## 📁 Cấu trúc thư mục

```
frontend/
│
├── .env.local                  ← Biến môi trường (NEXT_PUBLIC_API_URL)
│
└── src/
    ├── app/                    ← App Router (Next.js 16)
    │   ├── layout.tsx          ← Root layout (font Inter, metadata SEO)
    │   ├── globals.css         ← CSS Variables (dark theme)
    │   ├── page.tsx            ← Dashboard — danh sách alert
    │   ├── login/
    │   │   └── page.tsx        ← Trang đăng nhập
    │   ├── alerts/
    │   │   └── [id]/
    │   │       └── page.tsx    ← Chi tiết một alert
    │   └── cameras/
    │       └── page.tsx        ← Quản lý camera
    │
    ├── hooks/
    │   ├── useAlerts.ts        ← State & logic cho Dashboard
    │   ├── useAlert.ts         ← State & logic cho Alert Detail
    │   └── useCameras.ts       ← State & logic cho Cameras
    │
    ├── components/
    │   └── Sidebar.tsx         ← Navigation sidebar dùng chung
    │
    └── lib/
        ├── api.ts              ← API client + TypeScript interfaces
        └── auth.ts             ← JWT cookie helpers
```

---

## 🚀 Cách chạy

```powershell
cd frontend
npm run dev     # Dev server: http://localhost:3000
npm run build   # Build production
npm start       # Chạy production build
```

**Yêu cầu:** Backend phải đang chạy tại `http://localhost:8080`.

---

## 🔧 Cấu hình

### `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Prefix `NEXT_PUBLIC_` bắt buộc để biến được expose ra phía client (browser). Khi deploy Docker, đổi thành `http://api:8080` (tên service trong compose network).

---

## 📚 Giải thích các file

### `src/lib/api.ts` — API Client

API client tập trung, tất cả component đều dùng object `api` thay vì gọi `fetch` trực tiếp:

```ts
api.login(username, password)           // → { token, username, roles }
api.getAlerts(page, size, token)        // → { content: Alert[], totalElements, totalPages }
api.getAlert(id, token)                 // → Alert
api.getCameras(token)                   // → Camera[]
api.createCamera(data, token)           // → Camera
api.deleteCamera(id, token)             // → void
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
```

---

### `src/lib/auth.ts` — JWT Auth Helper

Lưu JWT vào cookie (dùng thư viện `js-cookie`) thay vì `localStorage` (bảo mật hơn vì không bị XSS đọc):

```ts
saveAuth({ token, username, roles })  // Lưu vào cookie, expires: 1 ngày
getToken()                            // Lấy token hiện tại
getUser()                             // Lấy { username, roles }
clearAuth()                           // Xóa cookie khi logout
isAdmin()                             // Kiểm tra có ROLE_ADMIN không
```

---

### `src/hooks/` — Logic Layer (Tách biệt UI và Data)

Toàn bộ logic quản lý State (`useState`), Side effects (`useEffect`), và gọi API được tách ra khỏi UI (Pages) và đưa vào các Custom Hooks:

- **`useAlerts()`**: Quản lý danh sách alert cho Dashboard, trạng thái loading/error, phân trang, và auto-refresh 30s.
- **`useAlert(id)`**: Fetch chi tiết một cảnh báo theo ID.
- **`useCameras()`**: Quản lý danh sách camera, gọi API thêm/xóa camera và reload list tự động.

Việc tách lớp này giúp các file `.tsx` trong `src/app/` trở nên cực kỳ gọn nhẹ, chỉ tập trung vào việc render giao diện HTML/CSS.

---

### `src/components/Sidebar.tsx` — Navigation

Navigation sidebar dùng chung cho tất cả trang (trừ Login). Hiển thị:
- Logo + brand name
- Danh sách link điều hướng với highlight trang hiện tại
- Username + role của người đang đăng nhập
- Nút Đăng xuất (xóa cookie → redirect `/login`)

---

## 🗺️ Các trang

### `/login` — Trang đăng nhập

- Form đơn giản: username + password
- Gọi `POST /api/v1/auth/login` → nhận JWT
- Lưu token bằng `saveAuth()` → redirect về `/`
- Hiển thị lỗi nếu sai credentials

### `/` — Dashboard

| Tính năng | Mô tả |
|---|---|
| Bảng alert | Hiển thị 15 alert/trang, phân trang |
| Màu sắc | Confidence ≥90% → đỏ, 75–90% → vàng, <75% → xanh |
| Auto-refresh | Tự động tải lại mỗi 30 giây |
| Click vào row | Chuyển sang trang chi tiết `/alerts/[id]` |
| Trạng thái | 🔴 Mới / ✅ Đã xử lý |

### `/alerts/[id]` — Chi tiết Alert

Hiển thị:
- Ảnh snapshot từ MinIO (nếu có)
- Tên camera, loại cảnh báo, độ tin cậy, thời gian, trạng thái
- Link URL ảnh gốc để truy cập trực tiếp

### `/cameras` — Quản lý Camera

| Quyền | Tính năng |
|---|---|
| Mọi user | Xem danh sách camera (card grid) |
| ADMIN | Nút "Thêm Camera" — form thêm mới |
| ADMIN | Nút "Xóa" trên từng card |

Form thêm camera yêu cầu: Tên, Vị trí, RTSP URL.

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
| `tailwindcss` | Utility CSS (dùng cho layout, spacing) |
| `lucide-react` | Icon library (Flame, Camera, LogOut...) |
| `js-cookie` | Đọc/ghi cookie phía client |
| `@types/js-cookie` | TypeScript types cho js-cookie |

---

*Tài liệu phản ánh trạng thái frontend tại **Giai đoạn 6**. Frontend chưa đổi trong MVP AI Worker video local; WebSocket real-time và `/admin/users` sẽ bổ sung sau nếu cần.*
