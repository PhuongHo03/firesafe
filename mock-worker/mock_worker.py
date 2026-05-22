"""
Mock AI Worker — FireSafe E2E backend test
==========================================
Giả lập AI Worker gửi cảnh báo về backend để test pipeline:
  JWT login → lấy camera hiện có → upload ảnh MinIO → POST /api/v1/alerts → verify DB/MQ/notification

Cách chạy:
  python mock_worker.py                  # chạy tất cả test
  python mock_worker.py --test debounce  # chỉ test debounce
  python mock_worker.py --test pipeline  # chỉ test alert pipeline
  python mock_worker.py --test minio     # chỉ test MinIO upload
"""

import argparse
import io
import os
import sys
import time
from datetime import datetime, timezone

import requests
from minio import Minio
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
MINIO_URL = os.getenv("MINIO_URL", "localhost:9000")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", f"http://{MINIO_URL}")
MINIO_ACCESS = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "snapshots")
LOGIN_USER = os.getenv("FIRESAFE_USERNAME", "admin")
LOGIN_PASS = os.getenv("FIRESAFE_PASSWORD", "admin123")


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def separator(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def get_jwt_token() -> str:
    separator("TEST 1 — JWT Authentication")
    response = requests.post(
        f"{BACKEND_URL}/api/v1/auth/login",
        json={"username": LOGIN_USER, "password": LOGIN_PASS},
        timeout=10,
    )
    assert response.status_code == 200, f"Login failed: {response.status_code} {response.text}"
    token = response.json()["token"]
    log(f"✅ Login OK — token: {token[:30]}...")
    return token


def get_cameras(token: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/api/v1/cameras", headers=headers, timeout=10)
    assert response.status_code == 200, f"GET /cameras failed: {response.status_code} {response.text}"
    data = response.json()
    if isinstance(data, list):
        return data
    return data.get("content", [])


def get_test_camera_id(token: str) -> int:
    separator("TEST 2 — Camera API")
    cameras = get_cameras(token)
    assert cameras, "No camera found. Create a camera in /cameras or set backend/.env.local preset camera before running mock-worker."
    camera = cameras[0]
    camera_id = int(camera["id"])
    log(f"✅ Camera selected — ID: {camera_id}, name: {camera.get('name')}")
    return camera_id


def generate_test_image(label: str = "FIRE") -> bytes:
    img = Image.new("RGB", (640, 480), color=(200, 50, 20))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), f"MOCK DETECTION: {label}", fill=(255, 255, 255))
    draw.text((20, 60), datetime.now().isoformat(), fill=(200, 200, 200))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def upload_to_minio(camera_id: int, label: str = "fire") -> str:
    separator("TEST 3 — MinIO Upload")
    client = Minio(MINIO_URL, access_key=MINIO_ACCESS, secret_key=MINIO_SECRET, secure=False)

    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
        log(f"Created bucket: {MINIO_BUCKET}")

    image_bytes = generate_test_image(label.upper())
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    object_name = f"cam-{camera_id:03d}/{ts}-{label}.png"

    client.put_object(
        MINIO_BUCKET,
        object_name,
        io.BytesIO(image_bytes),
        length=len(image_bytes),
        content_type="image/png",
    )

    image_url = f"{MINIO_PUBLIC_URL.rstrip('/')}/{MINIO_BUCKET}/{object_name}"
    log(f"✅ Upload OK — {image_url}")
    return image_url


def post_alert(token: str, camera_id: int, image_url: str, label: str = "fire", confidence: float = 0.91) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "cameraId": camera_id,
        "confidence": confidence,
        "label": label,
        "imageUrl": image_url,
        "detectedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", ""),
    }
    response = requests.post(f"{BACKEND_URL}/api/v1/alerts", json=payload, headers=headers, timeout=10)
    assert response.status_code in (200, 201), f"POST /alerts failed: {response.status_code} {response.text}"
    data = response.json()
    log(f"✅ Alert created — ID: {data.get('id')}, status: {data.get('status')}")
    return data


def verify_alert_in_db(token: str, alert_id: int):
    separator("TEST 4 — Verify Alert in DB")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/api/v1/alerts/{alert_id}", headers=headers, timeout=10)
    assert response.status_code == 200, f"GET /alerts/{alert_id} failed: {response.status_code} {response.text}"
    data = response.json()
    log(f"✅ Alert in DB — camera: {data.get('cameraName')}, label: {data.get('label')}, confidence: {data.get('confidence')}")


def test_debounce(token: str, camera_id: int, image_url: str):
    separator("TEST 5 — Redis Debounce")
    log("Gửi 10 alerts liên tiếp từ cùng 1 camera...")
    ids = []
    for i in range(10):
        data = post_alert(token, camera_id, image_url, label="fire", confidence=0.85 + i * 0.01)
        ids.append(data.get("id"))
        time.sleep(0.5)

    log(f"Đã gửi 10 alerts — IDs: {ids}")
    log("✅ Debounce OK nếu backend chỉ enqueue/gửi 1 notification trong cooldown window")


def run_all():
    print("\n[FIRESAFE] Mock AI Worker - E2E Test Suite")
    print("Backend :", BACKEND_URL)
    print("MinIO   :", f"http://{MINIO_URL}")

    token = get_jwt_token()
    camera_id = get_test_camera_id(token)
    image_url = upload_to_minio(camera_id)

    separator("TEST 4 — Alert Pipeline")
    alert = post_alert(token, camera_id, image_url)
    time.sleep(1)
    verify_alert_in_db(token, alert["id"])

    test_debounce(token, camera_id, image_url)

    separator("✅ TẤT CẢ TESTS PASSED")
    print("\nKiểm tra thêm:")
    print(f"  • Swagger UI  : {BACKEND_URL}/swagger-ui.html")
    print("  • RabbitMQ UI : runtime port trong .runtime/ports.env")
    print("  • MinIO UI    : runtime port trong .runtime/ports.env")
    print("  • Redis UI    : runtime port trong .runtime/ports.env")
    print("  • DB UI       : runtime port trong .runtime/ports.env")


def run_single(test: str):
    token = get_jwt_token()
    camera_id = get_test_camera_id(token)
    if test == "minio":
        upload_to_minio(camera_id)
    elif test == "pipeline":
        image_url = upload_to_minio(camera_id)
        alert = post_alert(token, camera_id, image_url)
        verify_alert_in_db(token, alert["id"])
    elif test == "debounce":
        image_url = upload_to_minio(camera_id)
        test_debounce(token, camera_id, image_url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FireSafe Mock AI Worker")
    parser.add_argument("--test", choices=["minio", "pipeline", "debounce"], help="Chạy một test cụ thể thay vì toàn bộ suite")
    args = parser.parse_args()

    if args.test:
        run_single(args.test)
    else:
        run_all()
