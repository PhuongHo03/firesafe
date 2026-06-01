# FireSafe

Local-first fire/smoke monitoring system with Spring Boot, Next.js, AI Worker RTSP preview/detection, Prometheus metrics, and Docker Compose runtime.

---

## Architecture

```text
Browser
  ↓
Nginx :3000
  ├─ /                  → frontend:3000
  ├─ /api/v1/*          → backend:8080
  ├─ /api/cameras/*     → worker:8090
  └─ /prometheus/*      → prometheus:9090
```

Runtime services:

- `backend/` — Spring Boot API, JWT auth, MariaDB, Redis debounce, RabbitMQ notifications, MinIO snapshots.
- `frontend/` — Next.js dashboard, login/register, alerts, cameras, Prometheus dashboard queries.
- `ai-worker/` — Python RTSP HTTP service, MJPEG preview, YOLO detect, MinIO upload, backend alert POST.
- `video-detect/` — offline YOLO video/image debug CLI.
- `docker-compose.yml` — full stack runtime: app services, infra, Prometheus/exporters, Nginx.

---

## Quick Start

Run from repo root:

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

Open:

```text
http://localhost:3000
```

Smoke checks:

```powershell
Invoke-WebRequest http://localhost:3000/health -UseBasicParsing
Invoke-RestMethod http://localhost:3000/actuator/health
Invoke-RestMethod http://localhost:3000/worker/health
Invoke-RestMethod http://localhost:3000/prometheus/-/healthy
Invoke-RestMethod "http://localhost:3000/prometheus/api/v1/query?query=up"
```

---

## Manual AI Worker Run

Docker Compose is the supported runtime. If you need to run AI Worker manually:

```powershell
cd ai-worker
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m src.main --port 8090 --backend-url http://localhost:8080 --minio-url localhost:9000
```

```bash
cd ai-worker
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python -m src.main --port 8090 --backend-url http://localhost:8080 --minio-url localhost:9000
```

Place model weights under `ai-worker/models/` or use `--model`.

---

## Manual Video Detect

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --save
```

```bash
./video-detect/run-video-detect.sh --source path/to/video.mp4 --save
```

---

## Key Flows

### Auth + dashboard

| Step | Component | Action |
|---:|---|---|
| 1 | User | Logs in through Next.js UI |
| 2 | Backend | Returns JWT and roles |
| 3 | Frontend | Stores auth cookie |
| 4 | Dashboard | Fetches alerts/cameras and Prometheus metrics |
| 5 | Camera page | Lists and manages cameras based on role |

### AI Worker realtime pipeline

| Step | Component | Action |
|---:|---|---|
| 1 | `/cameras` page | Sends start/stop request to AI Worker service |
| 2 | `ai-worker/src/main.py` | Starts the worker service |
| 3 | `ai-worker/src/controllers/ai_worker_controller.py` | Manages HTTP routes, camera workers, MJPEG endpoints |
| 4 | `ai-worker/src/services/camera_worker.py` | Reads RTSP, keeps preview frames, schedules detection |
| 5 | `ai-worker/src/services/detector.py` | Validates/loads YOLO model and runs frame inference |
| 6 | `ai-worker/src/repositories/storage.py` | Uploads annotated snapshot to MinIO |
| 7 | `ai-worker/src/repositories/backend_client.py` | Logs in and calls backend alert APIs |

---

## Repository Map

```text
.
├── backend/                         Spring Boot API
│   └── src/main/java/com/firesafe/backend/
│       ├── configs/
│       ├── controllers/
│       ├── dtos/
│       ├── middlewares/
│       ├── models/
│       ├── repositories/
│       ├── services/
│       └── utils/
│
├── frontend/                        Next.js operations dashboard
│   └── src/
│       ├── app/
│       ├── features/
│       ├── layouts/
│       └── shared/utils/
│
├── ai-worker/                       YOLO RTSP preview + detection service
│   ├── src/main.py                  AI Worker entrypoint
│   ├── src/controllers/
│   ├── src/services/
│   ├── src/repositories/
│   ├── src/configs/
│   ├── src/utils/
│   ├── requirements.txt
│   └── models/
│
├── video-detect/                    Offline YOLO video/image debug CLI
│
├── infra/
│   ├── nginx/
│   └── prometheus/
│
├── docs/
│   ├── explanations/
│   └── plannings/
│
└── docker-compose.yml               Full stack runtime
```

---

## Docs Index

| Document | Purpose |
|---|---|
| `docs/plannings/planning.md` | Roadmap, current phase, project context |
| `docs/explanations/backend-explanation.md` | Backend architecture |
| `docs/explanations/frontend-explanation.md` | Next.js UI structure and behavior |
| `docs/explanations/infrastructure-explanation.md` | Docker Compose, Nginx, Prometheus runtime |
| `docs/explanations/ai-worker-explanation.md` | AI Worker RTSP preview and YOLO detection service |
| `docs/explanations/video-detect-explanation.md` | Offline YOLO video/image debug CLI |

---

## Default Local URLs

| Service | URL | Credentials |
|---|---|---|
| App/Nginx | `http://localhost:3000` | — |
| Backend via Nginx | `http://localhost:3000/api/v1` | JWT after login |
| Swagger UI | `http://localhost:3000/swagger-ui.html` | JWT after login |
| Prometheus via Nginx | `http://localhost:3000/prometheus/api/v1/query` | — |
| Adminer | `http://localhost:7001` | Server `mariadb`, user from `.env` |
| MinIO Console | `http://localhost:7002` | `.env` MinIO credentials |
| RedisInsight | `http://localhost:7003` | configure Redis host `redis` |
| RabbitMQ UI | `http://localhost:7004` | `.env` RabbitMQ credentials |

---

## Notes

- Root `.env` is local-only. Commit `.env.example`, not `.env`.
- Do not commit generated folders: `.runtime/`, `venv/`, `node_modules/`, `.next/`, `backend/target/`, model `.pt`, `video-detect/runs/`.
- Default credentials are development-only.
