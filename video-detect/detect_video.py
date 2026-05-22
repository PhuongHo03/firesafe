from pathlib import Path

from src.config import VIDEO_DETECT_ROOT, parse_args
from src.detector import YoloDetector


DETECT_PROJECT = VIDEO_DETECT_ROOT / "runs" / "detect"


def main():
    settings = parse_args()
    detector = YoloDetector(Path(settings.model))
    results = detector.predict_file(
        source=settings.source,
        conf=settings.conf,
        show=settings.show,
        save=settings.save,
        project=DETECT_PROJECT,
    )
    print(f"Processed {len(results)} result batch(es).")
    if settings.save:
        print("Annotated output saved under video-detect/runs/detect/.")


if __name__ == "__main__":
    main()
