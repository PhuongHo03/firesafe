import { getApiUrl, request } from "@/shared/utils/http";
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

  startCameraDetection(cameraId: number, token: string) {
    return request<CameraDetectionStatus>(`/api/v1/cameras/${cameraId}/detection/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  stopCameraDetection(cameraId: number, token: string) {
    return request<CameraDetectionStatus>(`/api/v1/cameras/${cameraId}/detection/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getCameraDetectionStatus(cameraId: number, token: string) {
    return request<CameraDetectionStatus>(`/api/v1/cameras/${cameraId}/detection/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
    return getApiUrl(`/api/v1/cameras/${cameraId}/stream.mjpg`);
  },
};
