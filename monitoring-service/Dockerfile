FROM python:3.11-slim

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY service.py ./service.py

EXPOSE 8091
CMD ["python", "service.py", "--host", "0.0.0.0", "--port", "8091"]
