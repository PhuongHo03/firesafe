# 🤖 AI Worker — Giải thích RTSP Preview + YOLO Detection

> AI Worker thật cho Giai đoạn 6. Phiên bản hiện tại chạy như HTTP service host-process: đọc luồng RTSP, phát MJPEG preview cho trang `/cameras`, detect YOLO realtime và gửi alert thật về backend.

---

## 📁 Cấu trúc

```
ai-worker/
├── requirements.txt                   ← Dependencies: CPU-only torch/torchvision, ultralytics, opencv-python, requests, minio
├── models/                            ← Đặt best.pt tại đây
└── src/
    ├── __init__.py
    ├── main.py                        ← App entrypoint: đọc env/CLI, validate model, start HTTP server
    ├── controllers/
    │   ├── __init__.py
    │   └── ai_worker_controller.py    ← HTTP handler/routes, status cache, MJPEG stream, metrics text
    ├── configs/
    │   ├── __init__.py
    │   └── config.py                  ← Đường dẫn model mặc định/fallback cho service
    ├── services/
    │   ├── __init__.py
    │   ├── camera_worker.py           ← Shared RTSP reader + camera state + sustained alert cooldown
    │   ├── detector.py                ← Wrapper Ultralytics YOLO single-frame/batch predict + lỗi model thiếu
    │   └── inference_scheduler.py     ← Global scheduler gom latest frame nhiều camera để YOLO batch
    ├── repositories/
    │   ├── __init__.py
    │   ├── backend_client.py          ← Login backend + reserve/create alert
    │   └── storage.py                 ← Upload snapshot lên MinIO
    └── utils/
        ├── __init__.py
        └── snapshot.py                ← Encode annotated frame thành PNG bytes
```

AI Worker chạy bằng `src/main.py` (`python -m src.main`) trong Docker container hoặc khi chạy thủ công, gồm startup config và trạng thái mở RTSP theo từng camera/transport.

---

## 🎯 Luồng hiện tại

### Mode service — RTSP preview + detect từ trang Cameras

```
Trang /cameras
    → POST AI Worker /api/cameras/start
    → controllers/ai_worker_controller.py nhận request và tạo CameraWorkerConfig
    → services/camera_worker.py mở SharedRtspSource cho mỗi RTSP URL một lần bằng OpenCV/FFmpeg; Hikvision mainstream `.../Streaming/Channels/*01` fail thì thử substream `*02`
    → reader thread cập nhật latest raw frame + frame seq dùng chung
    → CameraWorker đăng ký vào services/inference_scheduler.py global
    → scheduler round-robin gom tối đa `AI_WORKER_BATCH_MAX_SIZE` latest frame từ các camera khác nhau, tối đa 1 frame/camera/batch
    → services/detector.py YOLO batch infer một lần, rồi trả result về đúng CameraWorker
    → MJPEG preview luôn lấy raw frame mới nhất và vẽ bbox detect còn hạn TTL
    → nếu fire/smoke duy trì đủ ngưỡng sustained và hết cooldown camera/zone: repositories/backend_client.py reserve Redis, repositories/storage.py upload MinIO, POST /api/v1/alerts
    → Dashboard hiển thị alert
```

Browser không đọc trực tiếp `rtsp://`, nên AI Worker service bridge RTSP thành MJPEG preview cho frontend.

Batch size là giới hạn tối đa, không phải batch cố định: nếu số camera có frame nhỏ hơn `AI_WORKER_BATCH_MAX_SIZE`, scheduler chạy partial batch sau `AI_WORKER_BATCH_MAX_WAIT_MS`; nếu nhiều camera hơn batch size, scheduler chia nhiều lượt theo round-robin. Preview bật/tắt chỉ ảnh hưởng browser xem MJPEG, không bật/tắt detect nền.

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

Khi không truyền `--model`, Python service dùng `models/best.pt`. Nếu thiếu model, `src/services/detector.py` báo lỗi rõ trong `.runtime/logs/ai-worker.log`. Muốn dùng model `.pt` khác thì truyền `--model`, ví dụ `--model ./models/custom.pt`.

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

## 🚀 Cách chạy service thủ công

Nếu cần chạy riêng AI Worker service ngoài Docker Compose:

```powershell
cd ai-worker
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m src.main --port 8090 --model .\models\best.pt
```

```bash
cd ai-worker
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python -m src.main --port 8090 --model ./models/best.pt
```

---

## ⚙️ Service Arguments

AI Worker đọc cấu hình từ process env hoặc CLI args; RTSP mặc định thử `default,udp,tcp` để ưu tiên nhiều channel rồi fallback sang TCP khi cần ổn định.

| Argument | Bắt buộc | Default | Mô tả |
|---|---:|---|---|
| `--host` | Không | `127.0.0.1` | Host bind service |
| `--port` | Không | `8090` | Port HTTP service |
| `--model` | Không | `models/best.pt` | Path model YOLO `.pt`; nếu truyền cờ này thì dùng đúng path đó |
| `--conf` | Không | `AI_WORKER_CONF`, fallback `0.25` | Ngưỡng confidence |
| `--backend-url` | Không | `http://localhost:8080` | Backend API base URL |
| `--username` | Không | `admin@nhattienchung.vn` | Email backend để login |
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
| `--batch-max-size` | Không | `AI_WORKER_BATCH_MAX_SIZE`, fallback `1` | Số frame tối đa trong một batch infer cross-camera |
| `--batch-max-wait-ms` | Không | `AI_WORKER_BATCH_MAX_WAIT_MS`, fallback `50` | Thời gian chờ tối đa trước khi chạy partial batch |
| `--scheduler-idle-sleep-ms` | Không | `AI_WORKER_SCHEDULER_IDLE_SLEEP_MS`, fallback `5` | Khoảng nghỉ ngắn khi scheduler chưa có frame mới |

---

## 🔌 HTTP endpoints

| Endpoint | Method | Mục đích |
|---|---|---|
| `/health` | GET | Health check, trả `{ "status": "UP" }` |
| `/api/monitoring/summary` | GET | Monitoring JSON cũ: status, số workers/sources, trạng thái từng camera đang detect |
| `/metrics` | GET | Prometheus text metrics cho Prometheus scrape: worker/source/camera counters và inference avg |
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

Camera phải tồn tại trong DB trước khi bấm Start Detect trên trang `/cameras`.

---

## ⚠️ Giới hạn hiện tại

- RTSP loop đã có reconnect backoff 5s → 10s → 20s → 30s.
- OpenCV đọc RTSP qua FFmpeg; nếu VLC/ffplay không mở được URL thì AI Worker cũng không mở được.
- AI Worker tránh mở trùng cùng một `rtspUrl` và tự fallback Hikvision mainstream `*01` sang substream `*02`; nếu thiết bị vẫn giới hạn mọi channel về 1 session thì phải tăng giới hạn trên thiết bị/NVR.
- Alert dùng sustained detection ở AI Worker nên không tạo alert cho object xuất hiện thoáng qua.
- Cooldown tạo alert nằm ở backend Redis reserve: AI Worker hỏi reserve trước, chỉ upload MinIO và POST alert khi Redis cho phép.
- Alert trùng cùng camera/label trong TTL bị skip trước upload nên không spam MinIO/MariaDB/RabbitMQ/Telegram.
- `detectedAt` gửi theo giờ local `Asia/Ho_Chi_Minh` để DB/API khớp mốc giờ vận hành tại Việt Nam.
- Chưa export ONNX/TensorRT.
- Chưa benchmark false positive/false negative trên video thực tế.

---

*Tài liệu phản ánh trạng thái ai-worker tại **Giai đoạn 9**. Phiên bản hiện tại là RTSP HTTP service host-process/containerizable Worker với cấu trúc layered (`controllers/`, `services/`, `repositories/`, `configs/`, `utils/`): preview MJPEG, YOLO detect realtime bằng global cross-camera inference scheduler, upload MinIO, gửi alert thật về backend và export Prometheus metrics cho Prometheus.*
