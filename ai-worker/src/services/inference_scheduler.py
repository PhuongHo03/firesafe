import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Protocol

from src.services.detector import YoloDetector


@dataclass(frozen=True)
class InferenceCandidate:
    camera_id: int
    frame: object
    frame_seq: int
    captured_at: float
    conf: float


@dataclass(frozen=True)
class InferenceResult:
    camera_id: int
    frame: object
    frame_seq: int
    captured_at: float
    inference_ms: float
    result: object | None = None
    error: str | None = None


class SchedulableCamera(Protocol):
    config: object

    def inference_candidate(self, now: float) -> Optional[InferenceCandidate]: ...

    def mark_inference_submitted(self, frame_seq: int, now: float): ...

    def handle_inference_result(self, result: InferenceResult): ...


class InferenceScheduler:
    def __init__(self, model_path: Path, batch_max_size: int, batch_max_wait_ms: float, idle_sleep_ms: float):
        self._detector = YoloDetector(model_path)
        self._batch_max_size = max(1, batch_max_size)
        self._batch_max_wait_seconds = max(0.0, batch_max_wait_ms / 1000.0)
        self._idle_sleep_seconds = max(0.001, idle_sleep_ms / 1000.0)
        self._workers: dict[int, SchedulableCamera] = {}
        self._worker_order: list[int] = []
        self._round_robin_index = 0
        self._lock = threading.Lock()
        self._metrics_lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._batches_total = 0
        self._frames_inferred_total = 0
        self._inference_ms_total = 0.0
        self._errors_total = 0

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)

    def register(self, worker: SchedulableCamera):
        camera_id = worker.config.camera_id
        with self._lock:
            if camera_id not in self._workers:
                self._worker_order.append(camera_id)
            self._workers[camera_id] = worker

    def unregister(self, camera_id: int):
        with self._lock:
            self._workers.pop(camera_id, None)
            self._worker_order = [item for item in self._worker_order if item != camera_id]
            if self._worker_order:
                self._round_robin_index %= len(self._worker_order)
            else:
                self._round_robin_index = 0

    def status(self) -> dict:
        with self._lock:
            registered = len(self._workers)
        with self._metrics_lock:
            avg_batch_size = (self._frames_inferred_total / self._batches_total) if self._batches_total else 0.0
            avg_inference_ms = (self._inference_ms_total / self._batches_total) if self._batches_total else 0.0
            return {
                "running": self._thread.is_alive() if self._thread else False,
                "registeredCameras": registered,
                "batchMaxSize": self._batch_max_size,
                "batchMaxWaitMs": int(self._batch_max_wait_seconds * 1000),
                "batchesTotal": self._batches_total,
                "framesInferredTotal": self._frames_inferred_total,
                "avgBatchSize": avg_batch_size,
                "avgInferenceMs": avg_inference_ms,
                "errorsTotal": self._errors_total,
            }

    def _run_loop(self):
        while not self._stop_event.is_set():
            candidates = self._collect_batch()
            if not candidates:
                self._stop_event.wait(self._idle_sleep_seconds)
                continue
            self._infer(candidates)

    def _collect_batch(self) -> list[InferenceCandidate]:
        deadline = time.monotonic() + self._batch_max_wait_seconds
        candidates: list[InferenceCandidate] = []
        seen_camera_ids: set[int] = set()

        while not self._stop_event.is_set():
            now = time.monotonic()
            for candidate in self._scan_candidates(now):
                if candidate.camera_id in seen_camera_ids:
                    continue
                if candidates and candidate.conf != candidates[0].conf:
                    continue
                candidates.append(candidate)
                seen_camera_ids.add(candidate.camera_id)
                worker = self._get_worker(candidate.camera_id)
                if worker:
                    worker.mark_inference_submitted(candidate.frame_seq, now)
                if len(candidates) >= self._batch_max_size:
                    return candidates

            if candidates and (self._batch_max_wait_seconds == 0 or time.monotonic() >= deadline):
                return candidates
            if not candidates:
                return []
            self._stop_event.wait(self._idle_sleep_seconds)

        return candidates

    def _scan_candidates(self, now: float) -> list[InferenceCandidate]:
        with self._lock:
            if not self._worker_order:
                return []
            ordered_ids = self._worker_order[:]
            start = self._round_robin_index % len(ordered_ids)
            rotated_ids = ordered_ids[start:] + ordered_ids[:start]
            self._round_robin_index = (start + 1) % len(ordered_ids)
            workers = [self._workers.get(camera_id) for camera_id in rotated_ids]

        candidates: list[InferenceCandidate] = []
        for worker in workers:
            if worker is None:
                continue
            candidate = worker.inference_candidate(now)
            if candidate:
                candidates.append(candidate)
        return candidates

    def _get_worker(self, camera_id: int) -> SchedulableCamera | None:
        with self._lock:
            return self._workers.get(camera_id)

    def _infer(self, candidates: list[InferenceCandidate]):
        started_at = time.monotonic()
        try:
            results = self._detector.predict_batch([candidate.frame for candidate in candidates], conf=min(candidate.conf for candidate in candidates))
            inference_ms = (time.monotonic() - started_at) * 1000
            with self._metrics_lock:
                self._batches_total += 1
                self._frames_inferred_total += len(candidates)
                self._inference_ms_total += inference_ms
            for index, candidate in enumerate(candidates):
                result = results[index] if index < len(results) else None
                self._dispatch(InferenceResult(
                    camera_id=candidate.camera_id,
                    frame=candidate.frame,
                    frame_seq=candidate.frame_seq,
                    captured_at=candidate.captured_at,
                    inference_ms=inference_ms,
                    result=result,
                ))
        except Exception as exc:
            inference_ms = (time.monotonic() - started_at) * 1000
            with self._metrics_lock:
                self._errors_total += 1
            error = str(exc)
            for candidate in candidates:
                self._dispatch(InferenceResult(
                    camera_id=candidate.camera_id,
                    frame=candidate.frame,
                    frame_seq=candidate.frame_seq,
                    captured_at=candidate.captured_at,
                    inference_ms=inference_ms,
                    error=error,
                ))

    def _dispatch(self, result: InferenceResult):
        worker = self._get_worker(result.camera_id)
        if worker:
            worker.handle_inference_result(result)
