import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";
import { Camera, CameraDetectionStatus, CameraFormState } from "@/features/cameras/types/camera";

export function buildCreateCameraRequest(form: CameraFormState): Omit<Camera, "id"> {
  return { ...form, active: true };
}

export function buildWorkerUnavailableStatus(cameraId: number): CameraDetectionStatus {
  return { cameraId, running: false, error: "AI Worker chưa sẵn sàng" };
}

export function getSystemLoadPct(metrics: DashboardMetrics) {
  const ramPct = metrics.system.ramTotalBytes > 0 ? (metrics.system.ramUsedBytes / metrics.system.ramTotalBytes) * 100 : 0;
  const gpuPct = metrics.system.gpu.available ? metrics.system.gpu.utilPct : 0;
  return Math.max(metrics.system.cpuPct, ramPct, gpuPct);
}

export function hasWorkerStatus(status?: CameraDetectionStatus) {
  return Boolean(status && (status.running || status.error || status.hasFrame || status.lastAlertAt));
}
