# 🎬 video-detect — Giải thích CLI detect video/image offline

> Công cụ debug YOLO độc lập để chạy thử model với video hoặc ảnh local, không gọi backend, không upload MinIO, không tạo alert.

---

## 📁 Cấu trúc

```text
video-detect/
├── detect_video.py          ← Entry point CLI
├── requirements.txt         ← Dependencies: ultralytics, opencv-python
├── run-video-detect.ps1     ← Runner Windows scoped trong video-detect/, tự tạo venv, cài deps và forward args
├── run-video-detect.sh      ← Runner Linux scoped trong video-detect/, tự tạo venv, cài deps và forward args
├── src/
│   ├── config.py            ← Parse CLI args + chọn model mặc định/fallback
│   └── detector.py          ← Wrapper Ultralytics YOLO
├── models/                  ← Đặt wildfire-smoke-fire.pt hoặc best.pt tại đây
└── runs/                    ← Output annotated video/image khi dùng --save
```

---

## 🎯 Vai trò

`video-detect/` dùng để kiểm tra nhanh model YOLO với file local trước khi đưa vào AI Worker realtime.

Khác với `ai-worker/`:

| Thành phần | Mục đích |
|---|---|
| `video-detect/` | Debug offline với video/image local |
| `ai-worker/` | Service HTTP đọc RTSP, stream MJPEG preview, upload MinIO, POST alert backend |

`video-detect/` không phụ thuộc runtime chính và không nằm trong `docker-compose.yml`. Có thể chạy riêng nếu có Python, dependencies và model `.pt`; Docker Compose chỉ chạy AI Worker realtime trong `ai-worker/`.

---

## 🚀 Cách sử dụng

Runner scoped trong `video-detect/`, chạy từ thư mục gốc project.

Windows:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4
```

Linux:

```bash
./video-detect/run-video-detect.sh --source path/to/video.mp4
```

Cả hai runner forward nguyên args vào `detect_video.py`. Các ví dụ dưới dùng runner Windows; trên Linux dùng cùng args với `./video-detect/run-video-detect.sh`.

Lưu output đã vẽ bounding box:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --save
```

Đổi confidence threshold:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --conf 0.4
```

Chỉ định model khác:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --model path\to\model.pt
```

Hiển thị cửa sổ preview khi detect:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --show
```

Kết hợp nhiều cờ:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --model path\to\model.pt --conf 0.4 --show --save
```

---

## 🚀 Cách chạy thủ công

Nếu không dùng `run-video-detect.ps1` hoặc `run-video-detect.sh`, chạy trực tiếp trong `video-detect/`.

Windows:

```powershell
cd video-detect
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe detect_video.py --source path\to\video.mp4 --save
.\venv\Scripts\python.exe detect_video.py --source path\to\video.mp4 --model .\models\best.pt --conf 0.4
```

Linux:

```bash
cd video-detect
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python detect_video.py --source path/to/video.mp4 --save
./venv/bin/python detect_video.py --source path/to/video.mp4 --model ./models/best.pt --conf 0.4
```

---

## ⚙️ Luồng chạy

```text
run-video-detect.ps1, run-video-detect.sh hoặc manual Python venv
    → tạo video-detect/venv nếu chưa có
    → cài dependencies bằng Python trong venv
    → chạy detect_video.py với args CLI
        → src/config.py parse args
        → chọn model
        → src/detector.py load YOLO
        → validate source file
        → model.predict(...)
        → lưu output nếu --save
```

---

## 🧩 CLI args

| Cờ | Bắt buộc | Mặc định | Mô tả |
|---|---:|---|---|
| `--source` | Có | — | Path tới video/image local |
| `--model` | Không | `models/wildfire-smoke-fire.pt`, fallback `models/best.pt` | Path tới YOLO `.pt` |
| `--conf` | Không | `0.25` | Confidence threshold |
| `--show` | Không | `false` | Mở cửa sổ preview detect |
| `--save` | Không | `false` | Lưu output dưới `video-detect/runs/detect/` |

Nếu truyền `--model`, CLI dùng đúng path đó và không fallback.

---

## 📦 Model mặc định

Khi không truyền `--model`, `src/config.py` chọn theo thứ tự:

1. `video-detect/models/wildfire-smoke-fire.pt`
2. `video-detect/models/best.pt`

Nếu cả hai không tồn tại, `src/detector.py` fail rõ ràng:

```text
Model not found: ...
Place wildfire-smoke-fire.pt or best.pt under video-detect/models/, or pass --model.
```

---

## 📤 Output

Khi chạy xong, CLI in số batch đã xử lý:

```text
Processed 1 result batch(es).
```

Nếu có `--save`, output nằm dưới:

```text
video-detect/runs/detect/
```

`runs/` là artifact local, không commit.

---

## 🗂️ File nên giữ / có thể xóa

| Path | Giữ? | Lý do |
|---|---:|---|
| `detect_video.py` | Có | Entry point CLI |
| `requirements.txt` | Có | Khai báo dependencies |
| `run-video-detect.ps1` | Có | Runner Windows tự tạo venv/cài deps/forward args |
| `run-video-detect.sh` | Có | Runner Linux tự tạo venv/cài deps/forward args |
| `src/config.py` | Có | Parse args + model fallback |
| `src/detector.py` | Có | Load YOLO + predict source file |
| `models/*.pt` | Local | Model nặng, tải riêng, đã ignore |
| `venv/` | Không commit | Tự tạo lại bằng runner |
| `runs/` | Không commit | Output generated khi dùng `--save` |

---

## ✅ Khi nào dùng video-detect

Dùng khi cần:

- test model `.pt` có nhận diện lửa/khói không
- kiểm tra `--conf` phù hợp trước khi tune AI Worker realtime
- debug video/image local không cần backend/frontend/infra
- tạo output annotated để xem bounding box

Không dùng để:

- đọc RTSP realtime
- stream MJPEG preview lên UI
- upload snapshot MinIO
- gửi alert về backend
- test Redis/RabbitMQ/Telegram pipeline

---

*Tài liệu phản ánh trạng thái video-detect tại **Giai đoạn 8**. Công cụ này vẫn là CLI debug offline, tách khỏi Worker RTSP service chính và không nằm trong Docker Compose runtime.*
