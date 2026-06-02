import { Camera, CameraDetectionStatus, CameraFormState } from "@/features/cameras/types/camera";

export function buildCreateCameraRequest(form: CameraFormState): Omit<Camera, "id"> {
  return { ...form, active: true };
}

export function buildWorkerUnavailableStatus(cameraId: number): CameraDetectionStatus {
  return { cameraId, running: false, error: "AI Worker chưa sẵn sàng" };
}

export function hasWorkerStatus(status?: CameraDetectionStatus) {
  return Boolean(status && (status.running || status.error || status.hasFrame || status.lastAlertAt));
}
