from datetime import datetime, timezone

import requests


class BackendClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.token: str | None = None

    def login(self) -> str:
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"username": self.username, "password": self.password},
            timeout=10,
        )
        response.raise_for_status()
        self.token = response.json()["token"]
        return self.token

    def create_alert(self, camera_id: int, label: str, confidence: float, image_url: str) -> dict:
        if self.token is None:
            self.login()

        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "cameraId": camera_id,
            "confidence": confidence,
            "label": label,
            "imageUrl": image_url,
            "detectedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", ""),
        }
        response = requests.post(
            f"{self.base_url}/api/v1/alerts",
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
