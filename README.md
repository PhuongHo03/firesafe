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
| AI Worker | In progress: local video and RTSP detection with YOLO `.pt` model |
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

### 1. Start local runtime

Windows:

```powershell
.\setup.ps1 up
```

Runtime metadata is written under `.runtime/`:

| File | Source |
|---|---|
| `.runtime/ports.env` | Local service ports selected at startup |
| `.runtime/logs/docker.log` | Docker infrastructure |
| `.runtime/logs/backend.log` | Spring Boot stdout |
| `.runtime/logs/backend.err.log` | Spring Boot stderr |
| `.runtime/logs/frontend.log` | Next.js stdout |
| `.runtime/logs/frontend.err.log` | Next.js stderr |

Stop runtime and remove `.runtime/`:

```powershell
.\setup.ps1 down
```

Aggressive cleanup:

```powershell
.\setup.ps1 clean
```

`up` picks the preferred ports first; if a port is busy before startup, it moves to the next free port and records the result in `.runtime/ports.env`.

`down` stops runtime and deletes `.runtime/`. `clean` also removes Compose containers/images/volumes.

### 2. Manual backend/frontend start

Linux/macOS or manual dev mode:

```bash
docker compose -f docker-compose.dev.yml up -d
cd backend
./mvnw spring-boot:run
```

Backend runs at:

| Service | URL |
|---|---|
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Actuator health | http://localhost:8080/actuator/health |

Default dev account:

| Username | Password |
|---|---|
| `admin` | `admin123` |

### 3. Start frontend

Windows:

```powershell
cd frontend
npm run dev
```

Linux/macOS:

```bash
cd frontend
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

### 4. Run backend E2E mock worker

Windows:

```powershell
.\mock-worker\run-mock-worker.ps1
```

Linux/macOS:

```bash
cd mock-worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python mock_worker.py
```

### 5. Run AI RTSP preview + detection

Place a YOLO model at one of:

```text
ai-worker/models/wildfire-smoke-fire.pt
ai-worker/models/best.pt
```

Windows local runtime starts the AI Worker service automatically:

```powershell
.\setup.ps1 up
```

Then open `/cameras`, add an RTSP URL, and click **Start Detect**. The AI Worker service reads RTSP continuously, serves MJPEG preview to the UI, and posts alerts to backend when YOLO detects fire/smoke.

To prefill one preset camera from env, edit:

```text
backend/.env.local
```

Set:

```env
FIRESAFE_PRESET_CAMERA_RTSP_URL=rtsp://user:password@192.168.1.50:554/stream1
FIRESAFE_PRESET_CAMERA_NAME=Camera RTSP Preset
FIRESAFE_PRESET_CAMERA_LOCATION=Preset
```

After `setup.ps1 up`, backend seeds that camera into DB if the RTSP URL is non-empty.

AI Worker logs are written to:

```text
.runtime/logs/ai-worker.log
.runtime/logs/ai-worker.err.log
```

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
| 1 | Operator | Logs in through Next.js UI |
| 2 | Backend | Returns JWT and roles |
| 3 | Frontend | Stores auth cookie |
| 4 | Dashboard | Fetches paginated alerts |
| 5 | Camera page | Lists and manages cameras based on role |

### AI worker realtime pipeline

| Step | Component | Action |
|---:|---|---|
| 1 | `/cameras` page | Sends start/stop request to AI Worker service |
| 2 | `ai-worker/service.py` | Manages camera workers and MJPEG endpoints |
| 3 | `ai-worker/src/camera_worker.py` | Reads RTSP, runs YOLO, keeps preview frames |
| 4 | `ai-worker/src/storage.py` | Uploads annotated snapshot to MinIO |
| 5 | `ai-worker/src/backend_client.py` | Logs in and calls `POST /api/v1/alerts` |

### Video detect offline pipeline

Run manually when you want to test a YOLO model against a local video/image:

```powershell
.\video-detect\run-video-detect.ps1 --source path\to\video.mp4 --save
```

Default model order: `video-detect/models/wildfire-smoke-fire.pt`, then `video-detect/models/best.pt`.

| Step | Component | Action |
|---:|---|---|
| 1 | `video-detect/run-video-detect.ps1` | Creates venv, installs deps, forwards args |
| 2 | `video-detect/detect_video.py` | Loads CLI config and orchestrates the run |
| 3 | `video-detect/src/detector.py` | Runs YOLO detection on local video/image |
| 4 | Local output | Saves annotated video/image under `video-detect/runs/detect` when `--save` is used |

---

## Deployment Profiles

| Profile | Command / Entry point | Includes | Status |
|---|---|---|---|
| Local runtime | `./setup.ps1 up` | Docker infra, Spring Boot backend, Next.js frontend, AI Worker service | Implemented |
| Local infrastructure | `docker compose -f docker-compose.dev.yml up -d` | MariaDB, Redis, RabbitMQ, MinIO, Adminer, RedisInsight | Implemented |
| Backend dev | `backend/mvnw` | Spring Boot API on host machine | Implemented |
| Frontend dev | `npm run dev` in `frontend/` | Next.js dashboard | Implemented |
| Mock E2E | `./mock-worker/run-mock-worker.ps1` | Synthetic alert pipeline test | Implemented |
| AI Worker service | `setup.ps1 up` | RTSP preview + YOLO detection + alert posting | In progress |
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
│   └── run-mock-worker.ps1
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
│   ├── src/
│   ├── models/
│   └── runs/
│
├── docs/
│   ├── explanations/                Service-level technical explanations
│   └── plannings/                   Roadmap and current project context
│
├── docker-compose.dev.yml           Local infrastructure stack
└── setup.ps1                        Windows runtime manager
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

| Service | URL / Port | Credentials |
|---|---|---|
| Spring Boot API | http://localhost:8080 | — |
| Swagger UI | http://localhost:8080/swagger-ui.html | JWT after login |
| MariaDB | `localhost:3306` | `firesafe` / `firesafe` |
| Adminer | http://localhost:8081 | Server `firesafe-mariadb`, user `firesafe` |
| Redis | `localhost:6379` | none |
| RedisInsight | http://localhost:5540 | configure host `firesafe-redis` |
| RabbitMQ | `localhost:5672` | `guest` / `guest` |
| RabbitMQ UI | http://localhost:15672 | `guest` / `guest` |
| MinIO API | http://localhost:9000 | `minioadmin` / `minioadmin` |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin` |

---

## Notes On Accuracy

- The backend, frontend, mock worker, local infrastructure, and AI local-video detection MVP are present in this repository.
- AI production integration is not complete yet: RTSP loop, metrics, ONNX/TensorRT export are planned next steps.
- The current AI worker quality depends entirely on the local `.pt` model supplied in `ai-worker/models/`.
- Default credentials and secrets are development-only.
- Generated folders such as `backend/target/`, `frontend/.next/`, `frontend/node_modules/`, and Python `venv/` may contain machine-specific paths and should not be treated as source of truth.
