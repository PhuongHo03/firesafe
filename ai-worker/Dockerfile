FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 --retries 5 -r requirements.txt

COPY service.py ./service.py
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV AI_MODEL_URL=https://huggingface.co/TommyNgx/YOLOv10-Fire-and-Smoke-Detection/resolve/main/best.pt
ENV AI_MODEL_PATH=/app/models/best.pt

EXPOSE 8090
ENTRYPOINT ["./docker-entrypoint.sh"]
