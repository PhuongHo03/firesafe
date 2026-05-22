# FireSafe — Claude Code Instructions

These instructions apply to the whole repository. More specific `CLAUDE.md` files in subdirectories may add local rules.

## Project context

FireSafe is a local-first fire/smoke monitoring system:

- `backend/` — Spring Boot API, JWT auth, MariaDB, Redis debounce, RabbitMQ notifications, MinIO snapshot URLs.
- `frontend/` — Next.js dashboard, login, alerts, cameras, AI Worker RTSP preview controls.
- `ai-worker/` — Python RTSP HTTP service, MJPEG preview, YOLO detect, MinIO upload, backend alert POST.
- `video-detect/` — offline YOLO video/image debug CLI.
- `mock-worker/` — independent backend E2E tester.
- `docker-compose.dev.yml` — local infrastructure only: MariaDB, Redis, RabbitMQ, MinIO, Adminer, RedisInsight.
- `setup.ps1` — Windows runtime manager for infra + backend + frontend + AI Worker.

Start by reading:

1. `docs/plannings/planning.md`
2. The relevant file under `docs/explanations/`

## Required project rules

Read and follow these rule files before non-trivial work:

- `.agents/rules/andrej-karpathy-skills.md`
- `.agents/rules/update-explanation.md`
- `.agents/rules/update-planning.md`

## Workflow

- Prefer small, surgical changes.
- Do not refactor unrelated code.
- Before editing, read the target file plus immediate callers/config/docs that define its behavior.
- For multi-file or behavior-changing work, state assumptions and success criteria first.
- Verify changes with the smallest relevant check.
- Do not claim tests pass unless they actually ran.

## Runtime policy

- Use `setup.ps1 up` for normal local runtime.
- Use `setup.ps1 down` to stop runtime and remove `.runtime/` only.
- Use `setup.ps1 clean` for aggressive cleanup: Docker containers/images/volumes/orphans plus generated local artifacts.
- Do not commit generated/local files: `.runtime/`, `venv/`, `node_modules/`, `.next/`, `backend/target/`, local JDK, model `.pt`, `video-detect/runs/`.

## Documentation policy

When code/config behavior changes:

1. Update the matching `docs/explanations/*-explanation.md` file.
2. Update its footer with the current phase.
3. Update `docs/plannings/planning.md` if structure, phase status, ports, service behavior, or explanation files changed.

Service mapping:

| Changed area | Documentation |
|---|---|
| `backend/` | `docs/explanations/backend-explanation.md` |
| `frontend/` | `docs/explanations/frontend-explanation.md` |
| `ai-worker/` | `docs/explanations/ai-worker-explanation.md` |
| `video-detect/` | `docs/explanations/video-detect-explanation.md` |
| `mock-worker/` | `docs/explanations/mock-worker-explanation.md` |
| `docker-compose*.yml`, `setup.ps1` | `docs/explanations/infrastructure-explanation.md` |
| project roadmap/context | `docs/plannings/planning.md` |

## Security / secrets

- `backend/.env.local` may contain private RTSP credentials. Never print or commit real credentials.
- Keep `.env.local` files local; commit only `.env.local.example` templates.
- Treat default credentials as development-only.

## Git policy

- Do not commit or push unless explicitly asked.
- Prefer adding specific files, not `git add .`.
- Do not force-push or run destructive git commands without explicit confirmation.
