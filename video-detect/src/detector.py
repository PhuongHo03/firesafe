from pathlib import Path

from ultralytics import YOLO


class YoloDetector:
    def __init__(self, model_path: Path):
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {model_path}\n"
                "Place a YOLO .pt model under video-detect/models/, or pass --model."
            )
        self.model = YOLO(str(model_path))

    def predict_file(self, source: str, conf: float, show: bool, save: bool, project: Path):
        if not Path(source).exists():
            raise FileNotFoundError(f"Source not found: {source}")
        return self.model.predict(
            source=source,
            conf=conf,
            show=show,
            save=save,
            project=str(project),
        )
