# 🤖 mock-worker — Giải thích Mock AI Worker

> Script Python giả lập AI Worker để test E2E pipeline backend mà không cần camera thật hay model AI.

---

## 📁 Cấu trúc

```
mock-worker/
├── mock_worker.py    ← Script chính, chạy toàn bộ E2E test suite
└── requirements.txt  ← Dependencies: requests, minio, Pillow
```

---

## 🚀 Cách sử dụng

**Cách nhanh nhất (Tự động dùng venv trong `mock-worker/`):**
Tại thư mục gốc của project, chạy:
```powershell
.\run-mock-worker.ps1
```

**Hoặc chạy thủ công từng bước:**
```bash
cd mock-worker

# Tạo và kích hoạt venv (nếu chạy lần đầu)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Cài dependencies
pip install -r requirements.txt

# Chạy toàn bộ E2E test suite
python mock_worker.py

# Chỉ chạy một test cụ thể
python mock_worker.py --test minio      # Test MinIO upload
python mock_worker.py --test pipeline   # Test alert pipeline (upload → POST → verify DB)
python mock_worker.py --test debounce   # Test Redis debounce (10 alerts liên tiếp)
```

**Yêu cầu trước khi chạy:**
1. Infrastructure đang chạy: `docker compose -f docker-compose.dev.yml up -d`
2. Backend đang chạy: `cd backend && .\mvnw.cmd spring-boot:run`

---

## 🧪 Các Test Cases

### Test 1 — JWT Authentication
- `POST /api/v1/auth/login` với `admin` / `admin123`
- Assert: HTTP 200, nhận JWT token
- Token được dùng cho tất cả API calls phía sau

### Test 2 — MinIO Upload
- Tạo ảnh PNG giả bằng Pillow (640×480, màu đỏ, có text timestamp)
- Upload lên bucket `snapshots` với path `cam-001/{timestamp}-fire.png`
- Assert: Upload thành công, URL trả về có dạng `http://localhost:9000/snapshots/...`

### Test 3 — Alert Pipeline
```
mock_worker
    → POST /api/v1/alerts (với image_url từ MinIO)
    → Backend lưu DB (MariaDB)
    → Backend enqueue RabbitMQ
    → NotificationWorker consume → Telegram (nếu enabled)
    → GET /api/v1/alerts/{id} → verify alert tồn tại trong DB
```

### Test 4 — Redis Debounce
- Gửi 10 alerts liên tiếp từ cùng camera trong ~5 giây
- **Kết quả mong đợi:** Backend chỉ gửi 1 notification (alert đầu tiên)
- 9 alerts còn lại: vẫn lưu DB, nhưng không enqueue RabbitMQ
- Kiểm tra: console backend chỉ thấy 1 log `🔥 FIRE ALERT!`

### Test 5 — Camera API
- `GET /api/v1/cameras` với JWT token
- Assert: HTTP 200, có ít nhất 1 camera trong kết quả

---

## 📊 Output mẫu khi chạy thành công

```
🔥 FireSafe Mock AI Worker — E2E Test Suite
Backend : http://localhost:8080
MinIO   : http://localhost:9000

============================================================
  TEST 1 — JWT Authentication
============================================================
[10:30:01] ✅ Login OK — token: eyJhbGciOiJIUzI1NiIsInR5c...

============================================================
  TEST 2 — MinIO Upload
============================================================
[10:30:01] ✅ Upload OK — http://localhost:9000/snapshots/cam-001/...

============================================================
  TEST 3 — Alert Pipeline (POST → DB → RabbitMQ → Notification)
============================================================
[10:30:02] ✅ Alert created — ID: 1, status: NEW
[10:30:03] ✅ Alert in DB — camera: Camera Test 01, label: fire, confidence: 0.91

============================================================
  TEST 4 — Redis Debounce (10 alerts trong 10 giây)
============================================================
[10:30:03] Gửi 10 alerts liên tiếp từ cùng 1 camera...
...
[10:30:08] ✅ Debounce OK nếu Telegram/log chỉ nhận được 1 notification

============================================================
  TEST 5 — Camera API
============================================================
[10:30:08] ✅ Camera list OK — 1 camera(s) found

============================================================
  ✅ TẤT CẢ TESTS PASSED
============================================================
```

---

## 🔗 UI để verify thủ công sau khi chạy

| UI | URL | Credentials | Kiểm tra gì |
|---|---|---|---|
| Swagger UI | http://localhost:8080/swagger-ui.html | JWT token | Test thêm API thủ công |
| Adminer | http://localhost:8081 | `firesafe`/`firesafe` | Bảng `alerts` có dữ liệu |
| RabbitMQ | http://localhost:15672 | `guest`/`guest` | Queue depth = 0 (đã consumed) |
| MinIO Console | http://localhost:9001 | `minioadmin`/`minioadmin` | Bucket `snapshots` có ảnh |
| RedisInsight | http://localhost:5540 | Host: `firesafe-redis` | Key `alert:debounce:1` có TTL |

---

*Tài liệu phản ánh trạng thái mock-worker tại **Giai đoạn 6**. Script này không đổi; AI Worker thật được tách riêng trong `ai-worker/`.*
