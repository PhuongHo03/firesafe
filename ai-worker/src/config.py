from pathlib import Path


AI_WORKER_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = AI_WORKER_ROOT / "models" / "best.pt"


def resolve_model_path(model: str | None) -> Path:
    if model:
        return Path(model)
    return DEFAULT_MODEL_PATH
