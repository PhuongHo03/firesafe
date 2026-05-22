// Centralized API client — reads NEXT_PUBLIC_API_URL from env
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const AI_WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL ?? "http://localhost:8090";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: res.statusText }));
    throw new Error(err.detail ?? err.title ?? "Unknown error");
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

async function requestAI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${AI_WORKER_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "AI Worker error");
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string) {
    return request<{ token: string; username: string; roles: string[] }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
  },

  getAlerts(page = 0, size = 20, token: string) {
    return request<{
      content: Alert[];
      totalElements: number;
      totalPages: number;
    }>(`/api/v1/alerts?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getAlert(id: number, token: string) {
    return request<Alert>(`/api/v1/alerts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

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
    return `${AI_WORKER_URL}/api/cameras/${cameraId}/stream.mjpg`;
  },
};

export interface Alert {
  id: number;
  cameraId: number;
  cameraName: string;
  label: string;
  confidence: number;
  imageUrl: string;
  detectedAt: string;
  status: string;
}

export interface Camera {
  id: number;
  name: string;
  rtspUrl: string;
  location: string;
  active: boolean;
}

export interface CameraDetectionStatus {
  cameraId: number;
  running: boolean;
  error: string | null;
  lastAlertAt?: string | null;
  hasFrame?: boolean;
}
