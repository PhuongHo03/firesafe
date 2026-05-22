import argparse
from dataclasses import dataclass
from pathlib import Path


VIDEO_DETECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = VIDEO_DETECT_ROOT / "models" / "wildfire-smoke-fire.pt"
FALLBACK_MODEL_PATH = VIDEO_DETECT_ROOT / "models" / "best.pt"


@dataclass(frozen=True)
class Settings:
    source: str
    model: Path
    conf: float
    show: bool
    save: bool


def parse_args() -> Settings:
    parser = argparse.ArgumentParser(description="Detect smoke/fire in a local video or image with Ultralytics YOLO.")
    parser.add_argument("--source", required=True, help="Path to input video/image")
    parser.add_argument("--model", help="Path to YOLO .pt model")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--show", action="store_true", help="Show detection window while running")
    parser.add_argument("--save", action="store_true", help="Save annotated output under video-detect/runs/detect")

    args = parser.parse_args()
    model = Path(args.model) if args.model else DEFAULT_MODEL_PATH
    if not args.model and not model.exists():
        model = FALLBACK_MODEL_PATH

    return Settings(
        source=args.source,
        model=model,
        conf=args.conf,
        show=args.show,
        save=args.save,
    )
