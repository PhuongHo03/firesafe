from pathlib import Path

from ultralytics import YOLO


def validate_model_path(model_path: Path):
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}\n"
            "Place best.pt under ai-worker/models/, or pass --model."
        )


class YoloDetector:
    def __init__(self, model_path: Path):
        validate_model_path(model_path)
        self.model = YOLO(str(model_path))

    def predict_batch(self, frames: list, conf: float):
        if not frames:
            return []
        return self.model.predict(frames, conf=conf, verbose=False)

    def predict_frame(self, frame, conf: float):
        return self.predict_batch([frame], conf=conf)
