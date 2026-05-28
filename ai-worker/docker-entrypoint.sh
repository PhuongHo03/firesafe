#!/bin/sh
set -eu

mkdir -p "$(dirname "$AI_MODEL_PATH")"

if [ ! -f "$AI_MODEL_PATH" ]; then
  echo "Downloading AI model to $AI_MODEL_PATH"
  if [ -n "${HF_TOKEN:-}" ]; then
    curl -L --fail --retry 3 --retry-delay 5 -H "Authorization: Bearer $HF_TOKEN" -o "$AI_MODEL_PATH" "$AI_MODEL_URL"
  else
    curl -L --fail --retry 3 --retry-delay 5 -o "$AI_MODEL_PATH" "$AI_MODEL_URL"
  fi
fi

exec python service.py --host 0.0.0.0 --port "${AI_WORKER_PORT:-8090}" --model "$AI_MODEL_PATH"
