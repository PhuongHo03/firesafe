#!/usr/bin/env bash
set -euo pipefail

worker_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
venv_dir="$worker_root/venv"
venv_python="$venv_dir/bin/python"
requirements_file="$worker_root/requirements.txt"
detect_file="$worker_root/detect_video.py"

if command -v python3 >/dev/null 2>&1; then
  python_cmd="python3"
elif command -v python >/dev/null 2>&1; then
  python_cmd="python"
else
  echo "Python not found. Install python3 or python."
  exit 1
fi

echo "FireSafe Video Detect - Portable Python Environment"
echo "Worker root: $worker_root"

cd "$worker_root"

if [ ! -f "$venv_python" ]; then
  echo "Creating venv..."
  "$python_cmd" -m venv "$venv_dir"
fi

echo "Installing dependencies..."
"$venv_python" -m pip --disable-pip-version-check install -r "$requirements_file" >/dev/null

echo "Running detection..."
"$venv_python" "$detect_file" "$@"
