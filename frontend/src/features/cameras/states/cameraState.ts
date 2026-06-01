import { CameraDetectionStatus, CameraFormState } from "@/features/cameras/types/camera";

export const CAMERA_MIN_REFRESH_MS = 250;
export const CAMERA_STATUS_REFRESH_MS = 10_000;
export const CAMERA_PREVIEW_LOAD_LIMIT_PCT = 80;

export const INITIAL_CAMERA_FORM: CameraFormState = {
  name: "",
  rtspUrl: "",
  location: "",
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function setCameraStatus(statuses: Record<number, CameraDetectionStatus>, cameraId: number, status: CameraDetectionStatus) {
  return { ...statuses, [cameraId]: status };
}

export function showCameraPreview(previewIds: Set<number>, cameraId: number) {
  return new Set(previewIds).add(cameraId);
}

export function hideCameraPreview(previewIds: Set<number>, cameraId: number) {
  const next = new Set(previewIds);
  next.delete(cameraId);
  return next;
}
