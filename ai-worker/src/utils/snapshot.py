import cv2
import numpy as np


def encode_png(frame: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", frame)
    if not ok:
        raise RuntimeError("Failed to encode detection frame as PNG")
    return buffer.tobytes()
