<div align="center">

# FireSafe

**Fire and smoke detection platform for camera-based safety monitoring.**

![Java](https://img.shields.io/badge/Java-21-red?style=for-the-badge)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-AI_Worker-blue?style=for-the-badge)
![YOLO](https://img.shields.io/badge/YOLO-Smoke%2FFire-orange?style=for-the-badge)
![MariaDB](https://img.shields.io/badge/MariaDB-Database-brown?style=for-the-badge)
![Redis](https://img.shields.io/badge/Redis-Debounce-red?style=for-the-badge)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Queue-orange?style=for-the-badge)
![MinIO](https://img.shields.io/badge/MinIO-Snapshot_Storage-red?style=for-the-badge)

[Overview](#overview) · [System Flow](#system-flow) · [Quick Start](#quick-start) · [Pipelines](#application-pipelines) · [Repository Map](#repository-map) · [Docs](#docs-index)

</div>

---

## Overview

FireSafe is a local-first fire and smoke monitoring system. It combines a Spring Boot backend, a Next.js operations dashboard, a Python YOLO AI worker, and local infrastructure for database, queue, cache, and object storage.

| Area | Current state |
|---|---|
| Backend API | Implemented: JWT auth, cameras, alerts, Redis debounce, RabbitMQ notification jobs |
| Frontend | Implemented: login, dashboard, alert detail, camera management |
| Mock Worker | Implemented: backend E2E test without real camera/model |
| AI Worker | In progress: RTSP preview and realtime YOLO detection with `.pt` model |
| Video Detect | Implemented: offline YOLO video/image debug CLI |
| Production deploy | Planned: Nginx, full Docker Compose, Prometheus, Grafana |

---

## System Flow

```mermaid
flowchart LR
    Camera[Camera / Video Source] --> AI[Python AI Worker]
    AI --> YOLO[YOLO smoke/fire detection]
    YOLO --> Snapshot[Snapshot / annotated frame]
    Snapshot --> MinIO[(MinIO snapshots)]
    YOLO --> AlertAPI[POST /api/v1/alerts]

    Browser[Browser] --> Frontend[Next.js Dashboard]
    Frontend --> API[Spring Boot API]
    AlertAPI --> API

    API --> MariaDB[(MariaDB)]
    API --> Redis[(Redis debounce)]
    API --> RabbitMQ[(RabbitMQ)]
    RabbitMQ --> Worker[NotificationWorker]
    Worker --> Telegram[Telegram notification]
```

---

## Quick Start

Run commands from the repository root.

### 1. Full local runtime

Starts Docker infra, backend, frontend, and AI Worker.

Windows:

```powershell
.\setup.ps1 up
.\setup.ps1 down
.\setup.ps1 clean
```

Linux:

```bash
./setup.sh up
./setup.sh down
./setup.sh clean
```

`up` picks preferred ports first; if a port is busy, it moves to the next free port and records the result in `.runtime/ports.env`.

Runtime metadata is written under `.runtime/`:

| File | Source |
|---|---|
| `.runtime/ports.env` | Local service ports selected at startup |
| `.runtime/logs/docker.log` | Docker infrastructure status and logs |
| `.runtime/logs/backend.log` | Spring Boot stdout/stderr |
| `.runtime/logs/frontend.log` | Next.js stdout/stderr |
| `.runtime/logs/ai-worker.log` | AI Worker stdout/stderr |

### 2. Backend E2E mock worker

Runs the synthetic backend pipeline test.

Windows runner:

```powershell
.\mock-worker\run-mock-worker.ps1
```

Linux runner:

```bash
./mock-worker/run-mock-worker.sh
```

Requires the main runtime/backend + MinIO to be running.

### 3. Offline YOLO video/image detect

Runs local model debug against a file.

Windows runner:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --save
```

Linux runner:

```bash
./video-detect/run-video-detect.sh --source path/to/video.mp4 --save
```

Requires a YOLO model under `video-detect/models/` or an explicit `--model` path.

---

## Manual Start

Use this when not using `setup.ps1 up` or `setup.sh up`.

### 1. Infrastructure / Docker

```powershell
docker compose -f docker-compose.dev.yml up -d
```

This starts MariaDB, Redis, RabbitMQ, MinIO, Adminer, and RedisInsight with manual default ports.

### 2. Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

```bash
cd backend
./mvnw spring-boot:run
```

Backend default URLs:

| Service | URL |
|---|---|
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Actuator health | http://localhost:8080/actuator/health |

Default dev account:

| Username | Password |
|---|---|
| `admin` | `admin123` |

To prefill one preset camera from env, edit `backend/.env.local` before starting backend:

```env
FIRESAFE_PRESET_CAMERA_RTSP_URL=rtsp://user:password@camera-host:554/stream1
FIRESAFE_PRESET_CAMERA_NAME=Camera RTSP Preset
FIRESAFE_PRESET_CAMERA_LOCATION=Preset
```

If the RTSP URL is non-empty, backend seeds that camera into DB on startup.

### 3. Frontend

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_AI_WORKER_URL=http://localhost:8090
```

Then start Next.js:

```powershell
cd frontend
npm install
npm run dev
```

Frontend default URL:

```text
http://localhost:3000
```

### 4. AI Worker

Place a YOLO model at one of:

```text
ai-worker/models/wildfire-smoke-fire.pt
ai-worker/models/best.pt
```

Then start the service:

```powershell
cd ai-worker
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe service.py --port 8090 --backend-url http://localhost:8080 --minio-url localhost:9000
```

```bash
cd ai-worker
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python service.py --port 8090 --backend-url http://localhost:8080 --minio-url localhost:9000
```

Open `/cameras`, add an RTSP URL, and click **Start Detect**. The AI Worker reads RTSP continuously, serves MJPEG preview to the UI, and posts alerts to backend when YOLO detects fire/smoke.

### 5. Mock Worker

Run after infrastructure and backend are available.

```powershell
cd mock-worker
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe mock_worker.py
```

```bash
cd mock-worker
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python mock_worker.py
```

### 6. Video Detect

Run independently when you want to test a YOLO model against a local video/image.

```powershell
cd video-detect
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe detect_video.py --source path\to\video.mp4 --save
```

```bash
cd video-detect
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python detect_video.py --source path/to/video.mp4 --save
```

Default model order: `video-detect/models/wildfire-smoke-fire.pt`, then `video-detect/models/best.pt`.

---

## Application Pipelines

### Alert ingestion pipeline

| Step | Component | Action |
|---:|---|---|
| 1 | AI Worker / Mock Worker | Sends alert payload to backend |
| 2 | Spring Boot API | Validates request and stores alert |
| 3 | MariaDB | Persists alert history |
| 4 | Redis | Debounces repeated alerts per camera |
| 5 | RabbitMQ | Queues notification job for first alert in debounce window |
| 6 | NotificationWorker | Sends Telegram notification when enabled |

### Dashboard pipeline

| Step | Component | Action |
|---:|---|---|
| 1 | User | Logs in through Next.js UI |
| 2 | Backend | Returns JWT and roles |
| 3 | Frontend | Stores auth cookie |
| 4 | Dashboard | Fetches paginated alerts |
| 5 | Camera page | Lists and manages cameras based on role |

### AI worker realtime pipeline

| Step | Component | Action |
|---:|---|---|
| 1 | `/cameras` page | Sends start/stop request to AI Worker service |
| 2 | `ai-worker/service.py` | Manages camera workers and MJPEG endpoints |
| 3 | `ai-worker/src/camera_worker.py` | Reads RTSP, keeps preview frames, schedules detection |
| 4 | `ai-worker/src/detector.py` | Validates/loads YOLO model and runs frame inference |
| 5 | `ai-worker/src/storage.py` | Uploads annotated snapshot to MinIO |
| 6 | `ai-worker/src/backend_client.py` | Logs in and calls `POST /api/v1/alerts` |

---

## Deployment Profiles

| Profile | Command / Entry point | Includes | Status |
|---|---|---|---|
| Local runtime | `./setup.ps1 up` / `./setup.sh up` | Docker infra, Spring Boot backend, Next.js frontend, AI Worker service | Implemented |
| Local infrastructure | `docker compose -f docker-compose.dev.yml up -d` | MariaDB, Redis, RabbitMQ, MinIO, Adminer, RedisInsight | Implemented |
| Backend dev | `backend/mvnw` | Spring Boot API on host machine | Implemented |
| Frontend dev | `npm run dev` in `frontend/` | Next.js dashboard | Implemented |
| AI Worker service | runtime manager `up` | RTSP preview + YOLO detection + alert posting | In progress |
| Production compose | `docker-compose.yml` | Nginx, frontend, API, AI worker, monitoring | Planned |

---

## Repository Map

```text
.
├── backend/                         Spring Boot API
│   ├── pom.xml
│   └── src/main/java/com/firesafe/backend/
│       ├── config/                  Security, RabbitMQ, OpenAPI
│       ├── controller/              Auth, alerts, cameras
│       ├── dto/                     API request/response contracts
│       ├── entity/                  JPA entities
│       ├── repository/              Spring Data repositories
│       ├── security/                JWT auth filter and token utilities
│       └── service/                 Alert, camera, MinIO, Telegram, notification logic
│
├── frontend/                        Next.js operations dashboard
│   └── src/
│       ├── app/                     App Router pages
│       ├── components/              Shared UI components
│       ├── hooks/                   Data-fetching hooks
│       └── lib/                     API client and auth helpers
│
├── mock-worker/                     Synthetic E2E backend tester
│   ├── mock_worker.py
│   ├── requirements.txt
│   ├── run-mock-worker.ps1
│   └── run-mock-worker.sh
│
├── ai-worker/                       YOLO RTSP preview + detection service
│   ├── service.py
│   ├── requirements.txt
│   ├── src/
│   └── models/                      Local model weights
│
├── video-detect/                    Offline YOLO video/image debug CLI
│   ├── detect_video.py
│   ├── requirements.txt
│   ├── run-video-detect.ps1
│   ├── run-video-detect.sh
│   ├── src/
│   ├── models/
│   └── runs/
│
├── docs/
│   ├── explanations/                Service-level technical explanations
│   └── plannings/                   Roadmap and current project context
│
├── docker-compose.dev.yml           Local infrastructure stack
├── setup.ps1                        Windows runtime manager
└── setup.sh                         Linux runtime manager
```

---

## Docs Index

| Document | Purpose |
|---|---|
| `docs/plannings/planning.md` | Roadmap, current phase, project context for future sessions |
| `docs/explanations/backend-explanation.md` | Backend architecture and file-by-file explanation |
| `docs/explanations/frontend-explanation.md` | Next.js UI structure and behavior |
| `docs/explanations/infrastructure-explanation.md` | `docker-compose.dev.yml` infrastructure details |
| `docs/explanations/mock-worker-explanation.md` | Mock AI worker E2E flow |
| `docs/explanations/ai-worker-explanation.md` | AI Worker RTSP preview and YOLO detection service |
| `docs/explanations/video-detect-explanation.md` | Offline YOLO video/image debug CLI |

---

## Local Service Ports

When using `setup.ps1 up` or `setup.sh up`, always read the actual ports from `.runtime/ports.env`.

| Service | Runtime URL / Port | Manual default | Credentials |
|---|---|---|---|
| Spring Boot API | `http://localhost:<BACKEND_PORT>` | `http://localhost:8080` | — |
| Swagger UI | `http://localhost:<BACKEND_PORT>/swagger-ui.html` | `http://localhost:8080/swagger-ui.html` | JWT after login |
| MariaDB | `localhost:<MARIADB_PORT>` | `localhost:3306` | `firesafe` / `firesafe` |
| Adminer | `http://localhost:<ADMINER_PORT>` | `http://localhost:8081` | Server `firesafe-mariadb`, user `firesafe` |
| Redis | `localhost:<REDIS_PORT>` | `localhost:6379` | none |
| RedisInsight | `http://localhost:<REDISINSIGHT_PORT>` | `http://localhost:5540` | configure host `firesafe-redis` |
| RabbitMQ | `localhost:<RABBITMQ_PORT>` | `localhost:5672` | `guest` / `guest` |
| RabbitMQ UI | `http://localhost:<RABBITMQ_UI_PORT>` | `http://localhost:15672` | `guest` / `guest` |
| MinIO API | `http://localhost:<MINIO_API_PORT>` | `http://localhost:9000` | `minioadmin` / `minioadmin` |
| MinIO Console | `http://localhost:<MINIO_CONSOLE_PORT>` | `http://localhost:9001` | `minioadmin` / `minioadmin` |

---

## Notes On Accuracy

- The backend, frontend, mock worker, local infrastructure, AI Worker RTSP service, and offline Video Detect CLI are present in this repository.
- AI Worker RTSP preview and YOLO detection are implemented for local development; Video Detect covers offline video/image model debugging; metrics and ONNX/TensorRT export are planned next steps.
- The current AI worker quality depends entirely on the local `.pt` model supplied in `ai-worker/models/`.
- Default credentials and secrets are development-only.
- Generated folders such as `backend/target/`, `frontend/.next/`, `frontend/node_modules/`, and Python `venv/` may contain machine-specific paths and should not be treated as source of truth.
