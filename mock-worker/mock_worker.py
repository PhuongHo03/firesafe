"""
Mock AI Worker — FireSafe Giai đoạn 4
======================================
Giả lập AI Worker gửi cảnh báo về backend để test E2E pipeline:
  JWT login → upload ảnh MinIO → POST /api/v1/alerts → verify DB/MQ/Telegram

Cách chạy:
  pip install -r requirements.txt
  python mock_worker.py                  # chạy tất cả test
  python mock_worker.py --test debounce  # chỉ test debounce
  python mock_worker.py --test pipeline  # chỉ test alert pipeline
  python mock_worker.py --test minio     # chỉ test MinIO upload
"""

import argparse
import io
import sys
import time
import uuid
from datetime import datetime, timezone

# Force UTF-8 output on Windows (default encoding is cp1252)
sys.stdout.reconfigure(encoding="utf-8")

import requests
from minio import Minio
from PIL import Image, ImageDraw, ImageFont

import os

# ── Cấu hình ──────────────────────────────────────────────────────────────────
BACKEND_URL  = os.getenv("BACKEND_URL", "http://localhost:8080")
MINIO_URL    = os.getenv("MINIO_URL", "localhost:9000")
MINIO_ACCESS = "minioadmin"
MINIO_SECRET = "minioadmin"
MINIO_BUCKET = "snapshots"

LOGIN_USER = "admin"
LOGIN_PASS = "admin123"

# camera_id phải khớp với seed data (V2__seed_data.sql)
TEST_CAMERA_ID = 1
# ──────────────────────────────────────────────────────────────────────────────


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def separator(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ── 1. JWT Auth ───────────────────────────────────────────────────────────────

def get_jwt_token() -> str:
    separator("TEST 1 — JWT Authentication")
    resp = requests.post(f"{BACKEND_URL}/api/v1/auth/login", json={
        "username": LOGIN_USER,
        "password": LOGIN_PASS,
    })
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    token = resp.json()["token"]
    log(f"✅ Login OK — token: {token[:30]}...")
    return token


# ── 2. MinIO Upload ───────────────────────────────────────────────────────────

def generate_test_image(label: str = "FIRE") -> bytes:
    """Tạo ảnh PNG giả dùng Pillow (không cần camera thật)."""
    img = Image.new("RGB", (640, 480), color=(200, 50, 20))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), f"MOCK DETECTION: {label}", fill=(255, 255, 255))
    draw.text((20, 60), datetime.now().isoformat(), fill=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def upload_to_minio(camera_id: int, label: str = "fire") -> str:
    separator("TEST 2 — MinIO Upload")
    client = Minio(MINIO_URL, access_key=MINIO_ACCESS, secret_key=MINIO_SECRET, secure=False)

    # Đảm bảo bucket tồn tại
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

    image_url = f"http://localhost:9000/{MINIO_BUCKET}/{object_name}"
    log(f"✅ Upload OK — {image_url}")
    return image_url


# ── 3. POST /api/v1/alerts ────────────────────────────────────────────────────

def post_alert(token: str, camera_id: int, image_url: str,
               label: str = "fire", confidence: float = 0.91) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "cameraId": camera_id,
        "confidence": confidence,
        "label": label,
        "imageUrl": image_url,
        "detectedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", ""),
    }
    resp = requests.post(f"{BACKEND_URL}/api/v1/alerts", json=payload, headers=headers)
    assert resp.status_code in (200, 201), \
        f"POST /alerts failed: {resp.status_code} {resp.text}"
    data = resp.json()
    log(f"✅ Alert created — ID: {data.get('id')}, status: {data.get('status')}")
    return data


# ── 4. GET /api/v1/alerts ─────────────────────────────────────────────────────

def verify_alert_in_db(token: str, alert_id: int):
    separator("TEST 3 — Verify Alert in DB")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BACKEND_URL}/api/v1/alerts/{alert_id}", headers=headers)
    assert resp.status_code == 200, f"GET /alerts/{alert_id} failed: {resp.text}"
    data = resp.json()
    log(f"✅ Alert in DB — camera: {data.get('cameraName')}, "
        f"label: {data.get('label')}, confidence: {data.get('confidence')}")


# ── 5. Debounce Test ──────────────────────────────────────────────────────────

def test_debounce(token: str, camera_id: int, image_url: str):
    separator("TEST 4 — Redis Debounce (10 alerts trong 10 giây)")
    log("Gửi 10 alerts liên tiếp từ cùng 1 camera...")
    ids = []
    for i in range(10):
        data = post_alert(token, camera_id, image_url,
                          label="fire", confidence=0.85 + i * 0.01)
        ids.append(data.get("id"))
        time.sleep(0.5)

    log(f"Đã gửi 10 alerts — IDs: {ids}")
    log("✅ Debounce OK nếu Telegram/log chỉ nhận được 1 notification (kiểm tra console backend)")


# ── 6. Camera List ────────────────────────────────────────────────────────────

def verify_camera_api(token: str):
    separator("TEST 5 — Camera API")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BACKEND_URL}/api/v1/cameras", headers=headers)
    assert resp.status_code == 200, f"GET /cameras failed: {resp.text}"
    cameras = resp.json()
    count = len(cameras) if isinstance(cameras, list) else len(cameras.get("content", []))
    log(f"✅ Camera list OK — {count} camera(s) found")


# ── Main ──────────────────────────────────────────────────────────────────────

def run_all():
    print("\n[FIRESAFE] Mock AI Worker - E2E Test Suite")
    print("Backend :", BACKEND_URL)
    print("MinIO   :", f"http://{MINIO_URL}")

    token    = get_jwt_token()
    image_url = upload_to_minio(TEST_CAMERA_ID)

    separator("TEST 3 — Alert Pipeline (POST → DB → RabbitMQ → Notification)")
    alert = post_alert(token, TEST_CAMERA_ID, image_url)
    time.sleep(1)  # cho NotificationWorker xử lý
    verify_alert_in_db(token, alert["id"])

    test_debounce(token, TEST_CAMERA_ID, image_url)
    verify_camera_api(token)

    separator("✅ TẤT CẢ TESTS PASSED")
    print("\nKiểm tra thêm:")
    print(f"  • Swagger UI  : {BACKEND_URL}/swagger-ui.html")
    print(f"  • RabbitMQ UI : http://localhost:15672  (guest/guest)")
    print(f"  • MinIO UI    : http://localhost:9001   (minioadmin/minioadmin)")
    print(f"  • Redis UI    : http://localhost:5540")
    print(f"  • DB UI       : http://localhost:8081")


def run_single(test: str):
    token = get_jwt_token()
    if test == "minio":
        upload_to_minio(TEST_CAMERA_ID)
    elif test == "pipeline":
        image_url = upload_to_minio(TEST_CAMERA_ID)
        alert = post_alert(token, TEST_CAMERA_ID, image_url)
        verify_alert_in_db(token, alert["id"])
    elif test == "debounce":
        image_url = upload_to_minio(TEST_CAMERA_ID)
        test_debounce(token, TEST_CAMERA_ID, image_url)
    else:
        print(f"Unknown test: {test}. Choices: minio | pipeline | debounce")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FireSafe Mock AI Worker")
    parser.add_argument("--test", choices=["minio", "pipeline", "debounce"],
                        help="Chạy một test cụ thể thay vì toàn bộ suite")
    args = parser.parse_args()

    if args.test:
        run_single(args.test)
    else:
        run_all()
