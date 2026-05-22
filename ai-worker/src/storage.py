import io
from datetime import datetime, timedelta, timezone

from minio import Minio


class MinioSnapshotStorage:
    def __init__(self, endpoint: str, access_key: str, secret_key: str, bucket: str):
        self.endpoint = endpoint
        self.bucket = bucket
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)

    def upload(self, camera_id: int, label: str, image_bytes: bytes) -> str:
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
        object_name = f"cam-{camera_id:03d}/{ts}-{label}.png"
        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(image_bytes),
            length=len(image_bytes),
            content_type="image/png",
        )
        return self.client.presigned_get_object(self.bucket, object_name, expires=timedelta(days=7))
