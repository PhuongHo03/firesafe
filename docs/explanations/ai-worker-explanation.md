# 🤖 AI Worker — Giải thích RTSP Preview + YOLO Detection

> AI Worker thật cho Giai đoạn 6. Phiên bản hiện tại chạy như HTTP service host-process: đọc luồng RTSP, phát MJPEG preview cho trang `/cameras`, detect YOLO realtime và gửi alert thật về backend.

---

## 📁 Cấu trúc

```
ai-worker/
├── service.py                         ← HTTP service: RTSP preview + start/stop detection
├── requirements.txt                   ← Dependencies: CPU-only torch/torchvision, ultralytics, opencv-python, requests, minio
├── models/                            ← Đặt best.pt tại đây
└── src/
    ├── __init__.py
    ├── camera_worker.py               ← Shared RTSP reader + YOLO detect thread + sustained alert cooldown
    ├── config.py                      ← Đường dẫn model mặc định/fallback cho service
    ├── detector.py                    ← Wrapper Ultralytics YOLO predict + thông báo lỗi model thiếu
    ├── snapshot.py                    ← Encode annotated frame thành PNG bytes
    ├── storage.py                     ← Upload snapshot lên MinIO
    └── backend_client.py              ← Login backend + POST /api/v1/alerts
```

AI Worker service được runtime manager (`setup.ps1 up` trên Windows hoặc `setup.sh up` trên Linux) tự start nền, ghi log unbuffered vào `.runtime/logs/ai-worker.log`, gồm startup config và trạng thái mở RTSP theo từng camera/transport.

---

## 🎯 Luồng hiện tại

### Mode service — RTSP preview + detect từ trang Cameras

```
Trang /cameras
    → POST AI Worker /api/cameras/start
    → SharedRtspSource mở mỗi RTSP URL một lần bằng OpenCV/FFmpeg; Hikvision mainstream `.../Streaming/Channels/*01` fail thì thử substream `*02`
    → reader thread cập nhật latest raw frame dùng chung
    → mỗi CameraWorker có YOLO detect thread riêng lấy latest frame theo interval
    → MJPEG preview luôn lấy raw frame mới nhất và vẽ bbox detect còn hạn TTL
    → nếu fire/smoke duy trì đủ ngưỡng sustained và hết cooldown camera/zone: upload MinIO, POST /api/v1/alerts
    → Dashboard hiển thị alert
```

Browser không đọc trực tiếp `rtsp://`, nên AI Worker service bridge RTSP thành MJPEG preview cho frontend.

### CLI debug video local

CLI debug video/image local đã tách sang `video-detect/`. Luồng này chạy độc lập, không kết nối backend, MinIO, auth, alert, và không được runtime manager quản lý.

---

## 📦 Model

| Thuộc tính | Giá trị |
|---|---|
| Framework | Ultralytics YOLO / PyTorch |
| Weight file | `.pt`: mặc định `best.pt` trong Python service |
| Classes kỳ vọng | `smoke`, `fire` |
| Input điển hình | RGB image/video, 640x640 |

Đặt model mặc định tại:

```powershell
ai-worker\models\best.pt
```

Khi không truyền `--model`, Python service dùng `models/best.pt`. Nếu thiếu model, `src/detector.py` báo lỗi rõ trong `.runtime/logs/ai-worker.log`. Muốn dùng model `.pt` khác thì truyền `--model`, ví dụ `--model ./models/custom.pt`.

Docker image cài PyTorch CPU-only (`torch==2.4.1+cpu`, `torchvision==0.19.1+cpu`) trước `ultralytics` để tránh pip kéo CUDA wheels rất lớn trong CPU-default container.

---

## 🚀 Cách chạy bằng Docker Compose

Workflow chính Giai đoạn 8 chạy AI Worker trong `docker-compose.yml`:

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

Trong Compose, `worker` chạy nội bộ tại `worker:8090`, không publish trực tiếp ra host. Browser gọi qua Nginx:

```text
http://localhost:<FRONTEND_PORT>/api/cameras/...
http://localhost:<FRONTEND_PORT>/worker/health
```

Mặc định:

```text
http://localhost:3000/cameras
http://localhost:3000/worker/health
```

Worker container tự tải/cache `best.pt` vào Docker volume `ai_worker_models` nếu `/app/models/best.pt` chưa tồn tại. URL tải mặc định lấy từ root `.env` qua `AI_MODEL_URL`; nếu cần Hugging Face private token thì set `HF_TOKEN`.

---

## 🚀 Cách chạy bằng runtime manager

Dùng khi cần chạy AI Worker host-process để debug native:

```powershell
.\setup.ps1 up
```

```bash
./setup.sh up
```

Runtime manager tự tạo/dùng virtual environment riêng tại:

```text
ai-worker/venv
```

Sau đó mở:

```text
http://localhost:<FRONTEND_PORT>/cameras
```

Thêm camera với RTSP URL rồi bấm **Start Detect**. Port thực tế xem trong:

```powershell
Get-Content .runtime\ports.env
```

```bash
cat .runtime/ports.env
```

AI Worker health native:

```text
http://localhost:<AI_WORKER_PORT>/health
```

---

## 🚀 Cách chạy service thủ công

Bình thường dùng runtime manager `up`. Nếu cần chạy riêng AI Worker service:

```powershell
cd ai-worker
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe service.py --port 8090 --model .\models\best.pt
```

```bash
cd ai-worker
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python service.py --port 8090 --model ./models/best.pt
```

---

## ⚙️ Service Arguments

`ai-worker/.env.local` có thể cấu hình local cho service, ví dụ `AI_WORKER_CONF=0.5`; RTSP mặc định thử `default,udp,tcp` để ưu tiên nhiều channel rồi fallback sang TCP khi cần ổn định.

| Argument | Bắt buộc | Default | Mô tả |
|---|---:|---|---|
| `--host` | Không | `127.0.0.1` | Host bind service |
| `--port` | Không | `8090` | Port HTTP service |
| `--model` | Không | `models/best.pt` | Path model YOLO `.pt`; nếu truyền cờ này thì dùng đúng path đó |
| `--conf` | Không | `AI_WORKER_CONF` trong `ai-worker/.env.local`, fallback `0.25` | Ngưỡng confidence |
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
| `--rtsp-transports` | Không | `AI_WORKER_RTSP_TRANSPORTS`, fallback `default,udp,tcp` | Thứ tự thử RTSP transport; `default` là không ép FFmpeg |
| `--rtsp-buffer-size` | Không | `AI_WORKER_RTSP_BUFFER_SIZE`, fallback `1` | OpenCV capture buffer size; `0` để bỏ qua |
| `--overlay-ttl-seconds` | Không | `AI_WORKER_OVERLAY_TTL_SECONDS`, fallback `2.0` | Số giây giữ bbox detect trên preview live |
| `AI_WORKER_STATUS_CACHE_TTL_SECONDS` | Không | `1.0` | TTL cache snapshot cho `/api/cameras/{id}/status` |
| `--sustained-detection-seconds` | Không | `AI_WORKER_SUSTAINED_DETECTION_SECONDS`, fallback `3.0` | Số giây fire/smoke phải duy trì trước khi gửi alert |

---

## 🔌 HTTP endpoints

| Endpoint | Method | Mục đích |
|---|---|---|
| `/health` | GET | Health check, trả `{ "status": "UP" }` |
| `/api/monitoring/summary` | GET | Monitoring JSON cũ: status, số workers/sources, trạng thái từng camera đang detect |
| `/metrics` | GET | Prometheus text metrics cho monitoring-service: worker/source/camera counters và inference avg |
| `/api/cameras/start` | POST | Start worker cho camera; body tối thiểu `{ cameraId, rtspUrl }` |
| `/api/cameras/stop` | POST | Stop worker theo `cameraId` |
| `/api/cameras/{id}/status` | GET | Trả trạng thái `{ cameraId, running, error, lastAlertAt, hasFrame }`; cache snapshot ngắn mặc định 1 giây |
| `/api/cameras/{id}/stream.mjpg` | GET | MJPEG stream cho frontend render bằng `<img>` |

Nếu bấm Start nhiều lần cho cùng camera, service trả status worker đang có và không tạo thêm RTSP session. Nếu nhiều camera dùng cùng `rtspUrl`, service chỉ mở một RTSP capture rồi chia sẻ frame cho các detector/preview tương ứng. Với URL Hikvision dạng `.../Streaming/Channels/*01`, nếu mainstream không mở được thì AI Worker tự thử substream `*02` để tránh giới hạn băng thông/session của thiết bị.

---

## 📤 Output

AI Worker service upload snapshot PNG lên bucket MinIO `snapshots` theo object key:

```text
cam-001/YYYY-mm-ddTHH-MM-SS-ffffff-label.png
```

URL trả về là pre-signed URL có hạn 7 ngày. Object key vẫn theo từng camera (`cam-XXX/...`); alert không phụ thuộc track ID.

Alert payload gửi backend:

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

```bash
./setup.sh up
```

Camera phải tồn tại trong DB trước khi bấm Start Detect trên trang `/cameras`.

---

## ⚠️ Giới hạn hiện tại

- RTSP loop đã có reconnect backoff 5s → 10s → 20s → 30s.
- OpenCV đọc RTSP qua FFmpeg; nếu VLC/ffplay không mở được URL thì AI Worker cũng không mở được.
- AI Worker tránh mở trùng cùng một `rtspUrl` và tự fallback Hikvision mainstream `*01` sang substream `*02`; nếu thiết bị vẫn giới hạn mọi channel về 1 session thì phải tăng giới hạn trên thiết bị/NVR.
- Alert dùng sustained detection + camera/zone cooldown nên không tạo alert riêng cho từng object trong cùng khung hình.
- Chưa export ONNX/TensorRT.
- Chưa benchmark false positive/false negative trên video thực tế.
- AI Worker có cooldown cảnh báo cơ bản; backend Redis debounce vẫn là lớp chống spam chính.

---

*Tài liệu phản ánh trạng thái ai-worker tại **Giai đoạn 8**. Phiên bản hiện tại là RTSP HTTP service host-process/containerizable Worker: preview MJPEG, YOLO detect realtime bằng `best.pt`, upload MinIO, gửi alert thật về backend và export Prometheus metrics cho monitoring-service.*
