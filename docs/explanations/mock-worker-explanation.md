# 🤖 mock-worker — Giải thích Mock AI Worker

> Script Python giả lập AI Worker để test E2E pipeline backend mà không cần camera thật hay model AI.

---

## 📁 Cấu trúc

```
mock-worker/
├── mock_worker.py         ← Script chính, chạy toàn bộ E2E test suite
├── requirements.txt       ← Dependencies: requests, minio, Pillow
├── run-mock-worker.ps1    ← Runner Windows scoped trong mock-worker/, tự tạo venv và cài deps
└── run-mock-worker.sh     ← Runner Linux scoped trong mock-worker/, tự tạo venv và cài deps
```

---

## 🚀 Cách sử dụng

**Cách nhanh nhất bằng runner (Tự động dùng venv trong `mock-worker/`, cài dependencies và chạy toàn bộ suite):**

Windows:

```powershell
.\mock-worker\run-mock-worker.ps1
```

Linux:

```bash
./mock-worker/run-mock-worker.sh
```

**Hoặc chạy thủ công từng bước:**

Windows:

```powershell
cd mock-worker
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe mock_worker.py
.\venv\Scripts\python.exe mock_worker.py --test minio
.\venv\Scripts\python.exe mock_worker.py --test pipeline
.\venv\Scripts\python.exe mock_worker.py --test debounce
```

Linux:

```bash
cd mock-worker
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python mock_worker.py
./venv/bin/python mock_worker.py --test minio
./venv/bin/python mock_worker.py --test pipeline
./venv/bin/python mock_worker.py --test debounce
```

**Yêu cầu trước khi chạy:**
1. Runtime chính đang chạy. Workflow Giai đoạn 8 ưu tiên `docker compose up --build -d`; native dev vẫn dùng `setup.ps1 up` trên Windows hoặc `setup.sh up` trên Linux.
2. Backend có ít nhất 1 camera thật/preset. Mock-worker sẽ lấy camera đầu tiên từ `GET /api/v1/cameras`, không tự seed camera.
3. Nếu test qua Docker Compose/Nginx, đặt `BACKEND_URL=http://localhost:<FRONTEND_PORT>` để gọi `/api/v1/...` qua proxy, mặc định `http://localhost:3000`.
4. `MINIO_URL` vẫn trỏ MinIO API host port (`localhost:<MINIO_API_PORT>`, mặc định `localhost:7006`) vì SDK MinIO không đi qua Nginx.
5. Nếu runtime native dùng port động, truyền env tương ứng trước khi chạy thủ công: `BACKEND_URL`, `MINIO_URL`, `MINIO_PUBLIC_URL`.

---

## ⚙️ Env vars

| Biến | Default | Mục đích |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Backend API base URL; Docker Compose/Nginx dùng `http://localhost:3000` mặc định |
| `MINIO_URL` | `localhost:9000` | MinIO API host:port cho SDK; Docker Compose dùng `localhost:7006` mặc định |
| `MINIO_PUBLIC_URL` | `http://<MINIO_URL>` | URL lưu vào `imageUrl`; Docker Compose thường là `http://localhost:7006` |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `snapshots` | Bucket ảnh mock |
| `FIRESAFE_USERNAME` | `admin` | User login backend |
| `FIRESAFE_PASSWORD` | `admin123` | Password login backend |

---

## 🧪 Các Test Cases

### Test 1 — JWT Authentication
- `POST /api/v1/auth/login` với `admin` / `admin123`
- Assert: HTTP 200, nhận JWT token
- Token được dùng cho tất cả API calls phía sau

### Test 2 — Camera API
- `GET /api/v1/cameras` với JWT token
- Lấy camera đầu tiên làm camera test
- Nếu chưa có camera, script fail rõ ràng và yêu cầu tạo/preset camera trước

### Test 3 — MinIO Upload
- Tạo ảnh PNG giả bằng Pillow (640×480, màu đỏ, có text timestamp)
- Upload lên bucket `snapshots` với object key `cam-{id}/{timestamp}-fire.png`
- Assert: Upload thành công, URL trả về có dạng `http://localhost:<MINIO_API_PORT>/snapshots/...`

### Test 4 — Alert Pipeline
```
mock_worker
    → POST /api/v1/alerts (với image_url từ MinIO)
    → Backend lưu DB (MariaDB)
    → Backend enqueue RabbitMQ nếu debounce key chưa tồn tại
    → NotificationWorker consume → Telegram (nếu enabled)
    → GET /api/v1/alerts/{id} → verify alert tồn tại trong DB
```

### Test 5 — Redis Debounce
- Gửi 10 alerts liên tiếp từ cùng camera trong ~5 giây
- **Kết quả mong đợi:** Backend chỉ gửi 1 notification (alert đầu tiên)
- 9 alerts còn lại: vẫn lưu DB, nhưng không enqueue RabbitMQ
- Kiểm tra backend log để xác nhận chỉ enqueue/gửi 1 notification trong cooldown window

---

## 📊 Output mẫu khi chạy thành công

```text
[FIRESAFE] Mock AI Worker - E2E Test Suite
Backend : http://localhost:<BACKEND_PORT>
MinIO   : http://localhost:<MINIO_API_PORT>

============================================================
  TEST 1 — JWT Authentication
============================================================
[10:30:01] ✅ Login OK — token: eyJhbGciOiJIUzI1NiIsInR5c...

============================================================
  TEST 2 — Camera API
============================================================
[10:30:01] ✅ Camera selected — ID: 1, name: Camera RTSP Preset

============================================================
  TEST 3 — MinIO Upload
============================================================
[10:30:01] ✅ Upload OK — http://localhost:<MINIO_API_PORT>/snapshots/cam-001/...

============================================================
  TEST 4 — Alert Pipeline
============================================================
[10:30:02] ✅ Alert created — ID: 1, status: NEW

============================================================
  TEST 4 — Verify Alert in DB
============================================================
[10:30:03] ✅ Alert in DB — camera: Camera RTSP Preset, label: fire, confidence: 0.91

============================================================
  TEST 5 — Redis Debounce
============================================================
[10:30:03] Gửi 10 alerts liên tiếp từ cùng 1 camera...
...
[10:30:08] ✅ Debounce OK nếu backend chỉ enqueue/gửi 1 notification trong cooldown window

============================================================
  ✅ TẤT CẢ TESTS PASSED
============================================================
```

---

## 🔗 UI để verify thủ công sau khi chạy

| UI | URL | Credentials | Kiểm tra gì |
|---|---|---|---|
| Swagger UI | `http://localhost:<BACKEND_PORT>/swagger-ui.html` | JWT token | Test thêm API thủ công |
| Adminer | `http://localhost:<ADMINER_PORT>` | `firesafe`/`firesafe` | Bảng `alerts` có dữ liệu |
| RabbitMQ | `http://localhost:<RABBITMQ_UI_PORT>` | `guest`/`guest` | Queue depth = 0 (đã consumed) |
| MinIO Console | `http://localhost:<MINIO_CONSOLE_PORT>` | `minioadmin`/`minioadmin` | Bucket `snapshots` có ảnh |
| RedisInsight | `http://localhost:<REDISINSIGHT_PORT>` | Host: `firesafe-redis` | Key `alert:debounce:<cameraId>` có TTL |

Port thực tế xem trong `.runtime/ports.env` sau khi chạy runtime manager `up`.

---

*Tài liệu phản ánh trạng thái mock-worker tại **Giai đoạn 8**. Mock-worker vẫn là E2E tester độc lập; runtime chính không phụ thuộc vào script này, Worker thật nằm trong `ai-worker/` và Compose không chạy mock-worker.*
