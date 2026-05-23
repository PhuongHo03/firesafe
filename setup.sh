#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$PROJECT_ROOT/.runtime"
LOGS_DIR="$RUNTIME_DIR/logs"
PIDS_DIR="$RUNTIME_DIR/pids"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
AI_WORKER_DIR="$PROJECT_ROOT/ai-worker"
JDK_DIR="$PROJECT_ROOT/jdk-21-linux"
JDK_ARCHIVE="$RUNTIME_DIR/jdk-21.tar.gz"
JDK_DOWNLOAD_URL="https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"
PYTHON_CMD=""
RESERVED_PORTS=()
PORT_KEYS=(
  FRONTEND_PORT
  BACKEND_PORT
  AI_WORKER_PORT
  ADMINER_PORT
  MINIO_CONSOLE_PORT
  REDISINSIGHT_PORT
  RABBITMQ_UI_PORT
  MARIADB_PORT
  MINIO_API_PORT
  REDIS_PORT
  RABBITMQ_PORT
)

declare -A PORTS

show_usage() {
  echo "Usage: ./setup.sh <up|down|clean>"
  echo "  up     Start Docker infra, backend, frontend, AI Worker; write logs to .runtime/logs/"
  echo "  down   Stop backend/frontend/AI Worker and Docker infra; delete .runtime"
  echo "  clean  Stop runtime, remove Docker containers/volumes/orphans, delete generated local artifacts"
}

ensure_runtime_dirs() {
  mkdir -p "$LOGS_DIR" "$PIDS_DIR"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

assert_command_exists() {
  local command_name="$1"
  local install_hint="$2"
  if ! command_exists "$command_name"; then
    echo "$command_name not found. Install it first: $install_hint" >&2
    exit 1
  fi
}

resolve_python() {
  if command_exists python3; then
    PYTHON_CMD="python3"
  elif command_exists python; then
    PYTHON_CMD="python"
  else
    echo "python3/python not found. Install Python 3 first: https://www.python.org/downloads/" >&2
    exit 1
  fi
}

test_port_available() {
  local port="$1"
  "$PYTHON_CMD" - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("127.0.0.1", port))
    except OSError:
        sys.exit(1)
PY
}

is_reserved_port() {
  local port="$1"
  local reserved
  for reserved in "${RESERVED_PORTS[@]}"; do
    if [[ "$reserved" == "$port" ]]; then
      return 0
    fi
  done
  return 1
}

get_free_port() {
  local port="$1"
  while ! test_port_available "$port" || is_reserved_port "$port"; do
    port=$((port + 1))
  done
  RESERVED_PORTS+=("$port")
  echo "$port"
}

pid_file_path() {
  echo "$PIDS_DIR/$1.pid"
}

meta_file_path() {
  echo "$PIDS_DIR/$1.json"
}

read_json_value() {
  local file="$1"
  local key="$2"
  sed -nE "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"?([^\",}]*)\"?,?[[:space:]]*$/\1/p" "$file" | head -n 1
}

process_start_time() {
  local pid="$1"
  if [[ -r "/proc/$pid/stat" ]]; then
    awk '{print $22}' "/proc/$pid/stat"
  fi
}

process_cwd() {
  local pid="$1"
  if [[ -e "/proc/$pid/cwd" ]]; then
    readlink -f "/proc/$pid/cwd"
  fi
}

get_process_from_pid_file() {
  local name="$1"
  local expected_working_directory="$2"
  local pid_file meta_file raw_pid metadata_name metadata_working_directory metadata_start_ticks current_start_ticks current_cwd

  pid_file="$(pid_file_path "$name")"
  meta_file="$(meta_file_path "$name")"
  if [[ ! -f "$pid_file" || ! -f "$meta_file" ]]; then
    return 1
  fi

  raw_pid="$(head -n 1 "$pid_file" 2>/dev/null || true)"
  if [[ -z "$raw_pid" || ! "$raw_pid" =~ ^[0-9]+$ ]]; then
    rm -f "$pid_file" "$meta_file"
    return 1
  fi

  if ! kill -0 "$raw_pid" 2>/dev/null; then
    rm -f "$pid_file" "$meta_file"
    return 1
  fi

  metadata_name="$(read_json_value "$meta_file" "name")"
  metadata_working_directory="$(read_json_value "$meta_file" "workingDirectory")"
  metadata_start_ticks="$(read_json_value "$meta_file" "startTicks")"
  current_start_ticks="$(process_start_time "$raw_pid")"
  current_cwd="$(process_cwd "$raw_pid")"

  if [[ "$metadata_name" != "$name" || "$metadata_working_directory" != "$expected_working_directory" ]]; then
    echo "Refusing to use invalid PID metadata for $name. Run setup.sh clean only after inspecting .runtime/pids/." >&2
    return 2
  fi

  if [[ -n "$metadata_start_ticks" && -n "$current_start_ticks" && "$metadata_start_ticks" != "$current_start_ticks" ]]; then
    echo "Refusing to stop $name because PID $raw_pid was reused by another process." >&2
    return 2
  fi

  if [[ -n "$current_cwd" && "$current_cwd" != "$expected_working_directory" ]]; then
    echo "Refusing to stop $name because PID $raw_pid is not running in $expected_working_directory." >&2
    return 2
  fi

  echo "$raw_pid"
}

write_process_metadata() {
  local name="$1"
  local pid="$2"
  local working_directory="$3"
  local start_ticks
  start_ticks="$(process_start_time "$pid")"
  "$PYTHON_CMD" - "$name" "$pid" "$working_directory" "$start_ticks" "$(meta_file_path "$name")" <<'PY'
import json
import sys
from datetime import datetime, timezone

metadata = {
    "pid": int(sys.argv[2]),
    "name": sys.argv[1],
    "workingDirectory": sys.argv[3],
    "startTicks": sys.argv[4],
    "startTime": datetime.now(timezone.utc).isoformat(),
}
with open(sys.argv[5], "w", encoding="utf-8") as handle:
    json.dump(metadata, handle, indent=2)
PY
}

read_ports_env() {
  local ports_file="$RUNTIME_DIR/ports.env"
  [[ -f "$ports_file" ]] || return 1

  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^([^=]+)=([0-9]+)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      PORTS["$key"]="$value"
    fi
  done < "$ports_file"
}

set_runtime_ports() {
  local backend_running=""
  local frontend_running=""

  if read_ports_env; then
    local status=0
    backend_running="$(get_process_from_pid_file "backend" "$BACKEND_DIR")" || status=$?
    if [[ "$status" -eq 2 ]]; then
      exit 1
    fi
    status=0
    frontend_running="$(get_process_from_pid_file "frontend" "$FRONTEND_DIR")" || status=$?
    if [[ "$status" -eq 2 ]]; then
      exit 1
    fi
    if [[ -n "$backend_running" || -n "$frontend_running" ]]; then
      :
    else
      PORTS=()
    fi
  fi

  if [[ ${#PORTS[@]} -eq 0 ]]; then
    RESERVED_PORTS=()
    local infra_port=7001
    PORTS[FRONTEND_PORT]="$(get_free_port 3000)"
    PORTS[BACKEND_PORT]="$(get_free_port 8080)"
    PORTS[AI_WORKER_PORT]="$(get_free_port 8090)"
    PORTS[ADMINER_PORT]="$(get_free_port "$infra_port")"
    PORTS[MINIO_CONSOLE_PORT]="$(get_free_port $((infra_port + 1)))"
    PORTS[REDISINSIGHT_PORT]="$(get_free_port $((infra_port + 2)))"
    PORTS[RABBITMQ_UI_PORT]="$(get_free_port $((infra_port + 3)))"
    PORTS[MARIADB_PORT]="$(get_free_port $((infra_port + 4)))"
    PORTS[MINIO_API_PORT]="$(get_free_port $((infra_port + 5)))"
    PORTS[REDIS_PORT]="$(get_free_port $((infra_port + 6)))"
    PORTS[RABBITMQ_PORT]="$(get_free_port $((infra_port + 7)))"
  fi

  local key
  for key in "${PORT_KEYS[@]}"; do
    export "$key=${PORTS[$key]}"
  done
}

write_ports_env() {
  local ports_file="$RUNTIME_DIR/ports.env"
  : > "$ports_file"
  local key
  for key in "${PORT_KEYS[@]}"; do
    echo "$key=${PORTS[$key]}" >> "$ports_file"
  done
  echo "Ports written to .runtime/ports.env"
}

write_frontend_env() {
  cat > "$FRONTEND_DIR/.env.local" <<EOF
# Auto-generated by setup.sh. Do not edit manually.
NEXT_PUBLIC_API_URL=http://localhost:${PORTS[BACKEND_PORT]}
NEXT_PUBLIC_AI_WORKER_URL=http://localhost:${PORTS[AI_WORKER_PORT]}
EOF
  echo "Frontend env written to frontend/.env.local"
}

remove_runtime_artifacts() {
  if [[ -d "$RUNTIME_DIR" ]]; then
    rm -rf "$RUNTIME_DIR"
  fi
}

java_major_version() {
  command_exists java || return 1
  local output
  output="$(java -version 2>&1 || true)"
  if [[ "$output" =~ version[[:space:]]+\"([0-9]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

expand_local_jdk() {
  if [[ -x "$JDK_DIR/bin/java" ]]; then
    return
  fi

  rm -rf "$JDK_DIR"
  echo "Downloading JDK 21 to project-local runtime cache..."
  if command_exists curl; then
    curl -L "$JDK_DOWNLOAD_URL" -o "$JDK_ARCHIVE"
  elif command_exists wget; then
    wget -O "$JDK_ARCHIVE" "$JDK_DOWNLOAD_URL"
  else
    echo "curl/wget not found. Install one of them to download JDK 21." >&2
    exit 1
  fi

  local extract_dir="$RUNTIME_DIR/jdk-extract"
  rm -rf "$extract_dir"
  mkdir -p "$extract_dir"
  tar -xzf "$JDK_ARCHIVE" -C "$extract_dir"

  local extracted_jdk
  extracted_jdk="$(find "$extract_dir" -maxdepth 2 -type f -path '*/bin/java' -print -quit | xargs -r dirname | xargs -r dirname)"
  if [[ -z "$extracted_jdk" || ! -x "$extracted_jdk/bin/java" ]]; then
    echo "Downloaded JDK archive did not contain bin/java" >&2
    exit 1
  fi

  mv "$extracted_jdk" "$JDK_DIR"
  rm -rf "$extract_dir" "$JDK_ARCHIVE"
  echo "JDK 21 ready: $JDK_DIR"
}

ensure_java21() {
  if [[ -x "$JDK_DIR/bin/java" ]]; then
    return
  fi

  local major=""
  major="$(java_major_version || true)"
  if [[ -n "$major" && "$major" -ge 21 ]]; then
    return
  fi

  expand_local_jdk
}

ensure_frontend_dependencies() {
  if [[ -d "$FRONTEND_DIR/node_modules" ]]; then
    return
  fi

  echo "Installing frontend dependencies with npm install..."
  (cd "$FRONTEND_DIR" && npm install)
}

ensure_prerequisites() {
  assert_command_exists docker "Docker Engine/Desktop: https://docs.docker.com/engine/install/"
  assert_command_exists node "Node.js LTS: https://nodejs.org/"
  assert_command_exists npm "Node.js LTS includes npm: https://nodejs.org/"
  resolve_python

  docker info >/dev/null
  ensure_java21
  ensure_frontend_dependencies
}

backend_local_env_command() {
  local env_file="$BACKEND_DIR/.env.local"
  [[ -f "$env_file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    local trimmed name value
    trimmed="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ -z "$trimmed" || "$trimmed" == \#* || "$trimmed" != *=* ]]; then
      continue
    fi
    name="${trimmed%%=*}"
    value="${trimmed#*=}"
    name="$(echo "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    value="$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      printf 'export %s=%q; ' "$name" "$value"
    fi
  done < "$env_file"
}

start_logged_process() {
  local name="$1"
  local working_directory="$2"
  local log_path="$3"
  local command_text="$4"
  local pid_file
  pid_file="$(pid_file_path "$name")"

  (
    cd "$working_directory"
    export PYTHONUTF8=1
    export PYTHONIOENCODING=utf-8
    exec bash -lc "$command_text"
  ) > "$log_path" 2>&1 &

  local pid=$!
  echo "$pid" > "$pid_file"
  write_process_metadata "$name" "$pid" "$working_directory"
  echo "$pid"
}

start_backend() {
  local running status=0
  running="$(get_process_from_pid_file "backend" "$BACKEND_DIR")" || status=$?
  if [[ "$status" -eq 2 ]]; then
    exit 1
  fi
  if [[ -n "$running" ]]; then
    echo "Backend already running (PID $running); keeping existing process."
    return
  fi

  local backend_log="$LOGS_DIR/backend.log"
  local java_setup=""
  if [[ -d "$JDK_DIR" ]]; then
    java_setup="export JAVA_HOME=$(printf '%q' "$JDK_DIR"); export PATH=\"\$JAVA_HOME/bin:\$PATH\"; "
  fi

  local env_setup="export BACKEND_PORT=${PORTS[BACKEND_PORT]}; export DB_PORT=${PORTS[MARIADB_PORT]}; export REDIS_PORT=${PORTS[REDIS_PORT]}; export RABBITMQ_PORT=${PORTS[RABBITMQ_PORT]}; export MINIO_ENDPOINT=http://localhost:${PORTS[MINIO_API_PORT]}; "
  local command_text="${java_setup}${env_setup}$(backend_local_env_command) chmod +x ./mvnw; ./mvnw spring-boot:run"
  local pid
  pid="$(start_logged_process "backend" "$BACKEND_DIR" "$backend_log" "$command_text")"
  echo "Backend starting (PID $pid); logs: .runtime/logs/backend.log"
}

start_frontend() {
  local running status=0
  running="$(get_process_from_pid_file "frontend" "$FRONTEND_DIR")" || status=$?
  if [[ "$status" -eq 2 ]]; then
    exit 1
  fi
  if [[ -n "$running" ]]; then
    echo "Frontend already running (PID $running); keeping existing process."
    return
  fi

  local frontend_log="$LOGS_DIR/frontend.log"
  local command_text="export NO_COLOR=1; export FORCE_COLOR=0; export TERM=dumb; export NEXT_TELEMETRY_DISABLED=1; export NEXT_PUBLIC_API_URL=http://localhost:${PORTS[BACKEND_PORT]}; export NEXT_PUBLIC_AI_WORKER_URL=http://localhost:${PORTS[AI_WORKER_PORT]}; npm run dev -- --port ${PORTS[FRONTEND_PORT]}"
  local pid
  pid="$(start_logged_process "frontend" "$FRONTEND_DIR" "$frontend_log" "$command_text")"
  echo "Frontend starting (PID $pid); logs: .runtime/logs/frontend.log"
}

start_ai_worker() {
  local running status=0
  running="$(get_process_from_pid_file "ai-worker" "$AI_WORKER_DIR")" || status=$?
  if [[ "$status" -eq 2 ]]; then
    exit 1
  fi
  if [[ -n "$running" ]]; then
    echo "AI Worker already running (PID $running); keeping existing process."
    return
  fi

  local ai_log="$LOGS_DIR/ai-worker.log"
  local command_text="if [ ! -d venv ]; then $PYTHON_CMD -m venv venv; fi; ./venv/bin/python -m pip --disable-pip-version-check install -r requirements.txt >/dev/null; export BACKEND_URL=http://localhost:${PORTS[BACKEND_PORT]}; export MINIO_URL=localhost:${PORTS[MINIO_API_PORT]}; ./venv/bin/python service.py --port ${PORTS[AI_WORKER_PORT]} --backend-url http://localhost:${PORTS[BACKEND_PORT]} --minio-url localhost:${PORTS[MINIO_API_PORT]}"
  local pid
  pid="$(start_logged_process "ai-worker" "$AI_WORKER_DIR" "$ai_log" "$command_text")"
  echo "AI Worker starting (PID $pid); logs: .runtime/logs/ai-worker.log"
}

remove_ansi_codes() {
  sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g'
}

docker_compose_ps_json() {
  docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null || true
}

infra_ready() {
  local status_json="$1"
  [[ -n "$status_json" ]] || return 1
  STATUS_JSON="$status_json" "$PYTHON_CMD" - <<'PY'
import json
import os
import sys

services = []
for line in os.environ["STATUS_JSON"].splitlines():
    line = line.strip()
    if not line:
        continue
    services.append(json.loads(line))

if len(services) < 6:
    sys.exit(1)

for service in services:
    state = service.get("State")
    health = service.get("Health")
    if state != "running" or (health and health != "healthy"):
        sys.exit(1)
PY
}

wait_infra_ready() {
  local timeout_seconds="$1"
  local deadline=$((SECONDS + timeout_seconds))
  while [[ $SECONDS -lt $deadline ]]; do
    local status_json
    status_json="$(docker_compose_ps_json)"
    if infra_ready "$status_json"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

start_infra() {
  local docker_log="$LOGS_DIR/docker.log"
  echo "Starting Docker infrastructure..."
  docker compose -f "$COMPOSE_FILE" up -d | tee "$docker_log"
  if wait_infra_ready 90; then
    echo -e "\n=== Docker Compose Status: all services running/healthy ===" >> "$docker_log"
  else
    echo -e "\n=== Docker Compose Status: TIMEOUT waiting for all services healthy ===" >> "$docker_log"
  fi
  docker compose -f "$COMPOSE_FILE" ps >> "$docker_log"
  echo -e "\n=== Docker Compose Logs ===" >> "$docker_log"
  docker compose -f "$COMPOSE_FILE" logs --no-color | remove_ansi_codes >> "$docker_log"
}

stop_infra() {
  if [[ -f "$COMPOSE_FILE" ]]; then
    echo "Stopping Docker infrastructure..."
    docker compose -f "$COMPOSE_FILE" down
  fi
}

clean_infra() {
  if [[ -f "$COMPOSE_FILE" ]]; then
    echo "Removing Docker containers, volumes, and orphans for this compose project..."
    docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
  fi
}

child_pids() {
  local parent_pid="$1"
  pgrep -P "$parent_pid" 2>/dev/null || true
}

stop_process_tree() {
  local pid="$1"
  local child
  for child in $(child_pids "$pid"); do
    stop_process_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
  sleep 1
  kill -9 "$pid" 2>/dev/null || true
}

stop_runtime_process() {
  local name="$1"
  local expected_working_directory="$2"
  local pid status=0
  pid="$(get_process_from_pid_file "$name" "$expected_working_directory")" || status=$?
  if [[ "$status" -eq 2 ]]; then
    exit 1
  fi

  if [[ -n "$pid" ]]; then
    echo "Stopping $name (PID $pid)..."
    stop_process_tree "$pid"
  else
    echo "Stopping $name... not running."
  fi

  rm -f "$(pid_file_path "$name")" "$(meta_file_path "$name")"
}

remove_backend_target() {
  local target_dir="$BACKEND_DIR/target"
  if [[ -d "$target_dir" ]]; then
    rm -rf "$target_dir"
    echo "Backend target removed."
  fi
}

remove_ai_worker_venv() {
  local venv_dir="$AI_WORKER_DIR/venv"
  if [[ -d "$venv_dir" ]]; then
    rm -rf "$venv_dir"
    echo "AI Worker venv removed."
  fi
}

remove_frontend_node_modules() {
  local node_modules="$FRONTEND_DIR/node_modules"
  if [[ -d "$node_modules" ]]; then
    rm -rf "$node_modules"
    echo "Frontend node_modules removed."
  fi
}

remove_frontend_next_build() {
  local next_build="$FRONTEND_DIR/.next"
  if [[ -d "$next_build" ]]; then
    rm -rf "$next_build"
    echo "Frontend .next removed."
  fi
}

remove_local_jdk() {
  if [[ -d "$JDK_DIR" ]]; then
    rm -rf "$JDK_DIR"
    echo "Local JDK removed."
  fi
}

if [[ -z "$COMMAND" ]]; then
  show_usage
  exit 1
fi

case "$COMMAND" in
  up)
    ensure_runtime_dirs
    ensure_prerequisites
    set_runtime_ports
    write_ports_env
    write_frontend_env
    start_infra
    start_backend
    start_frontend
    start_ai_worker
    echo "FireSafe runtime started."
    echo "Logs: .runtime/logs/"
    ;;
  down)
    ensure_runtime_dirs
    stop_runtime_process "ai-worker" "$AI_WORKER_DIR"
    stop_runtime_process "frontend" "$FRONTEND_DIR"
    stop_runtime_process "backend" "$BACKEND_DIR"
    stop_infra
    remove_runtime_artifacts
    echo "FireSafe runtime stopped. Runtime artifacts removed."
    ;;
  clean)
    ensure_runtime_dirs
    stop_runtime_process "ai-worker" "$AI_WORKER_DIR"
    stop_runtime_process "frontend" "$FRONTEND_DIR"
    stop_runtime_process "backend" "$BACKEND_DIR"
    clean_infra
    remove_backend_target
    remove_ai_worker_venv
    remove_frontend_node_modules
    remove_frontend_next_build
    remove_local_jdk
    remove_runtime_artifacts
    echo "FireSafe runtime cleaned. Runtime artifacts removed."
    ;;
  *)
    show_usage
    exit 1
    ;;
esac
