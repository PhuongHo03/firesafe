# 🤖 AI Worker — Giải thích RTSP Preview + YOLO Detection

> AI Worker thật cho Giai đoạn 6. Phiên bản hiện tại chạy như HTTP service host-process: đọc luồng RTSP, phát MJPEG preview cho trang `/cameras`, detect YOLO realtime và gửi alert thật về backend.

---

## 📁 Cấu trúc

```
ai-worker/
├── service.py                         ← HTTP service: RTSP preview + start/stop detection
├── requirements.txt                   ← Dependencies: ultralytics, opencv-python, requests, minio
├── models/                            ← Đặt wildfire-smoke-fire.pt hoặc best.pt tại đây
└── src/
    ├── __init__.py
    ├── camera_worker.py               ← RTSP reader thread + YOLO detector thread + gửi alert
    ├── config.py                      ← Đường dẫn model mặc định cho service
    ├── snapshot.py                    ← Encode annotated frame thành PNG bytes
    ├── storage.py                     ← Upload snapshot lên MinIO
    └── backend_client.py              ← Login backend + POST /api/v1/alerts
```

AI Worker service được `setup.ps1 up` tự start nền, ghi log vào `.runtime/logs/ai-worker.log`.

---

## 🎯 Luồng hiện tại

### Mode service — RTSP preview + detect từ trang Cameras

```
Trang /cameras
    → POST AI Worker /api/cameras/start
    → CameraWorker mở RTSP bằng OpenCV/FFmpeg TCP
    → reader thread cập nhật latest frame + MJPEG preview
    → detector thread lấy latest frame và chạy YOLO theo interval
    → nếu có fire/smoke: vẽ bounding box, upload MinIO, POST /api/v1/alerts
    → Dashboard hiển thị alert
```

Browser không đọc trực tiếp `rtsp://`, nên AI Worker service bridge RTSP thành MJPEG preview cho frontend.

### CLI debug video local

CLI debug video/image local đã tách sang `video-detect/`. Luồng này chạy độc lập, không kết nối backend, MinIO, auth, alert, và không được `setup.ps1` quản lý.

---

## 📦 Model

| Thuộc tính | Giá trị |
|---|---|
| Framework | Ultralytics YOLO / PyTorch |
| Weight file | `.pt`: ưu tiên `wildfire-smoke-fire.pt`, fallback `best.pt` khi chạy qua `setup.ps1` |
| Classes kỳ vọng | `smoke`, `fire` |
| Input điển hình | RGB image/video, 640x640 |

Đặt model tại một trong hai path:

```powershell
ai-worker\models\wildfire-smoke-fire.pt
ai-worker\models\best.pt
```

Khi chạy bằng `setup.ps1 up`, script chọn `wildfire-smoke-fire.pt` trước; nếu không có thì fallback sang `best.pt`. Khi chạy `service.py` thủ công, default argparse là `models/wildfire-smoke-fire.pt`; muốn dùng `best.pt` thì truyền `--model ./models/best.pt`.

---

## 🚀 Cách chạy Windows

Từ project root:

```powershell
.\setup.ps1 up
```

`setup.ps1` tự tạo/dùng virtual environment riêng tại:

```powershell
ai-worker\venv
```

Sau đó mở:

```text
http://localhost:<FRONTEND_PORT>/cameras
```

Thêm camera với RTSP URL rồi bấm **Start Detect**. Port thực tế xem trong:

```powershell
Get-Content .runtime\ports.env
```

AI Worker health:

```text
http://localhost:<AI_WORKER_PORT>/health
```

---

## 🚀 Cách chạy service thủ công

Bình thường dùng `setup.ps1 up`. Nếu cần chạy riêng AI Worker service:

```bash
cd ai-worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python service.py --port 8090 --model ./models/best.pt
```

---

## ⚙️ Service Arguments

| Argument | Bắt buộc | Default | Mô tả |
|---|---:|---|---|
| `--host` | Không | `127.0.0.1` | Host bind service |
| `--port` | Không | `8090` | Port HTTP service |
| `--model` | Không | `models/wildfire-smoke-fire.pt` | Path model YOLO `.pt`; fallback `best.pt` chỉ do `setup.ps1` chọn trước khi gọi service |
| `--conf` | Không | `0.25` | Ngưỡng confidence |
| `--backend-url` | Không | `http://localhost:8080` | Backend API base URL |
| `--username` | Không | `admin` | User backend để login |
| `--password` | Không | `admin123` | Password backend để login |
| `--minio-url` | Không | `localhost:9000` | MinIO endpoint |
| `--minio-access-key` | Không | `minioadmin` | MinIO access key |
| `--minio-secret-key` | Không | `minioadmin` | MinIO secret key |
| `--minio-bucket` | Không | `snapshots` | Bucket lưu snapshot |
| `--alert-cooldown-seconds` | Không | `30.0` | Khoảng cách tối thiểu giữa 2 alert do AI Worker gửi |
| `--detection-interval-seconds` | Không | `1.0` | Khoảng cách giữa các lần YOLO inference |
| `--reconnect-delay-seconds` | Không | `5.0` | Số giây chờ trước khi reconnect RTSP; backoff tối đa 30s |

---

## 🔌 HTTP endpoints

| Endpoint | Method | Mục đích |
|---|---|---|
| `/health` | GET | Health check, trả `{ "status": "UP" }` |
| `/api/cameras/start` | POST | Start worker cho camera; body tối thiểu `{ cameraId, rtspUrl }` |
| `/api/cameras/stop` | POST | Stop worker theo `cameraId` |
| `/api/cameras/{id}/status` | GET | Trả trạng thái `{ cameraId, running, error, lastAlertAt, hasFrame }` |
| `/api/cameras/{id}/stream.mjpg` | GET | MJPEG stream cho frontend render bằng `<img>` |

Nếu bấm Start nhiều lần cho cùng camera, service trả status worker đang có và không tạo thêm RTSP session.

---

## 📤 Output

AI Worker service upload snapshot PNG lên bucket MinIO `snapshots` theo object key:

```text
cam-001/YYYY-mm-ddTHH-MM-SS-label.png
```

URL trả về là pre-signed URL có hạn 7 ngày.

Alert payload gửi backend:

```json
{
  "cameraId": 1,
  "confidence": 0.91,
  "label": "fire",
  "imageUrl": "http://localhost:9000/snapshots/cam-001/...png",
  "detectedAt": "2026-05-20T10:30:00"
}
```

---

## 🔗 Backend integration

Các endpoint backend đang dùng:

| Endpoint | Mục đích |
|---|---|
| `POST /api/v1/auth/login` | Lấy JWT |
| `POST /api/v1/alerts` | Gửi cảnh báo thật |

Yêu cầu runtime local:

```powershell
.\setup.ps1 up
```

Camera phải tồn tại trong DB trước khi bấm Start Detect trên trang `/cameras`.

---

## ⚠️ Giới hạn hiện tại

- RTSP loop đã có reconnect backoff 5s → 10s → 20s → 30s.
- OpenCV đọc RTSP qua FFmpeg TCP; nếu VLC/ffplay không mở được URL thì AI Worker cũng không mở được.
- Chưa export ONNX/TensorRT.
- Chưa expose metrics Prometheus.
- Chưa benchmark false positive/false negative trên video thực tế.
- AI Worker có cooldown cảnh báo cơ bản; backend Redis debounce vẫn là lớp chống spam chính.

---

*Tài liệu phản ánh trạng thái ai-worker tại **Giai đoạn 6**. Phiên bản hiện tại là RTSP HTTP service host-process: preview MJPEG, YOLO detect realtime, upload MinIO và gửi alert thật về backend.*
