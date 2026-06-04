import { getAIWorkerUrl, request, requestAI } from "@/shared/utils/http";
import { Camera, CameraDetectionStatus, PreviewReservation, PreviewReservationsResponse } from "@/features/cameras/types/camera";

export const camerasApi = {
  getCameras(token: string) {
    return request<Camera[]>("/api/v1/cameras", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getCamera(id: number, token: string) {
    return request<Camera>(`/api/v1/cameras/${id}`, {
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

  async checkDetectionCapacity(token: string) {
    return request<{ allowed: boolean; reason?: string }>("/api/v1/detection/capacity", {
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

  reserveCameraPreview(cameraId: number, token: string) {
    return request<PreviewReservation>(`/api/v1/cameras/${cameraId}/preview/reserve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  keepAliveCameraPreview(cameraId: number, token: string) {
    return request<PreviewReservation>(`/api/v1/cameras/${cameraId}/preview/keepalive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  releaseCameraPreview(cameraId: number, token: string) {
    return request<PreviewReservation>(`/api/v1/cameras/${cameraId}/preview/release`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getMyPreviewReservations(token: string) {
    return request<PreviewReservationsResponse>("/api/v1/cameras/preview/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getCameraStreamUrl(cameraId: number) {
    return getAIWorkerUrl(`/api/cameras/${cameraId}/stream.mjpg`);
  },
};
