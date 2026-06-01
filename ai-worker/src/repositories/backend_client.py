from datetime import datetime
from zoneinfo import ZoneInfo

import requests

LOCAL_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")


class BackendClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.email = username
        self.password = password
        self.token: str | None = None

    def login(self) -> str:
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
            timeout=10,
        )
        response.raise_for_status()
        self.token = response.json()["token"]
        return self.token

    def reserve_alert(self, camera_id: int, label: str) -> dict:
        if self.token is None:
            self.login()

        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{self.base_url}/api/v1/alerts/reservations",
            json={"cameraId": camera_id, "label": label},
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def create_alert(self, camera_id: int, label: str, confidence: float, image_url: str, reservation_token: str) -> dict:
        if self.token is None:
            self.login()

        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "cameraId": camera_id,
            "confidence": confidence,
            "label": label,
            "imageUrl": image_url,
            "reservationToken": reservation_token,
            "detectedAt": datetime.now(LOCAL_TIMEZONE).replace(tzinfo=None).isoformat(timespec="seconds"),
        }
        response = requests.post(
            f"{self.base_url}/api/v1/alerts",
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
