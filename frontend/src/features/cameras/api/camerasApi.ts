import { getAIWorkerUrl, request, requestAI } from "@/shared/utils/http";
import { Camera, CameraDetectionStatus } from "@/features/cameras/types/camera";

export const camerasApi = {
  getCameras(token: string) {
    return request<Camera[]>("/api/v1/cameras", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  createCamera(data: Omit<Camera, "id">, token: string) {
    return request<Camera>("/api/v1/cameras", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  deleteCamera(id: number, token: string) {
    return request<void>(`/api/v1/cameras/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  startCameraDetection(camera: Camera) {
    return requestAI<CameraDetectionStatus>("/api/cameras/start", {
      method: "POST",
      body: JSON.stringify({ cameraId: camera.id, rtspUrl: camera.rtspUrl }),
    });
  },

  stopCameraDetection(cameraId: number) {
    return requestAI<CameraDetectionStatus>("/api/cameras/stop", {
      method: "POST",
      body: JSON.stringify({ cameraId }),
    });
  },

  getCameraDetectionStatus(cameraId: number) {
    return requestAI<CameraDetectionStatus>(`/api/cameras/${cameraId}/status`);
  },

  getCameraStreamUrl(cameraId: number) {
    return getAIWorkerUrl(`/api/cameras/${cameraId}/stream.mjpg`);
  },
};
