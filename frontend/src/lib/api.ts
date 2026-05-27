// Centralized API client — reads NEXT_PUBLIC_API_URL from env
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const AI_WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL ?? "http://localhost:8090";
const MONITORING_URL = process.env.NEXT_PUBLIC_MONITORING_URL ?? "http://localhost:8091";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
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
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "AI Worker error");
  }
  return res.json() as Promise<T>;
}

async function requestMonitoring<T>(path: string): Promise<T> {
  const res = await fetch(`${MONITORING_URL}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Monitoring service error");
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  },

  register(username: string, email: string, password: string) {
    return request<AuthResponse>(
      "/api/v1/auth/register",
      { method: "POST", body: JSON.stringify({ username, email, password }) }
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

  deleteAlert(id: number, token: string) {
    return request<void>(`/api/v1/alerts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  deleteAllAlerts(token: string) {
    return request<void>("/api/v1/alerts", {
      method: "DELETE",
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

  getDashboardMetrics() {
    return requestMonitoring<DashboardMetrics>("/api/dashboard/metrics");
  },

  getUsers(token: string) {
    return request<UserAccount[]>("/api/v1/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUser(id: number, data: { active: boolean; role: "ROLE_ADMIN" | "ROLE_VIEWER" }, token: string) {
    return request<UserAccount>(`/api/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  roles: string[];
}

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

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  active: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  generatedAt: string;
  backend: {
    status: string;
    requestsTotal: number;
    errorRate: number;
    avgLatencyMs: number;
    uptimeSeconds: number;
    error?: string;
  };
  aiWorker: {
    status: string;
    workers: number;
    sources: number;
    cameras: Array<{
      cameraId: number;
      running?: boolean;
      hasFrame?: boolean;
      hasError?: boolean;
      detectionsTotal?: number;
      alertsSentTotal?: number;
      inferenceMsAvg?: number;
    }>;
    error?: string;
  };
  system: {
    cpuPct: number;
    ramUsedBytes: number;
    ramTotalBytes: number;
    diskUsedBytes: number;
    diskTotalBytes: number;
    gpu: { available: false } | { available: true; utilPct: number; memoryUsedBytes: number; memoryTotalBytes: number };
  };
  infra: {
    redis: { status: string; usedMemoryBytes: number; keyCount: number; error?: string };
    rabbitmq: { status: string; messages: number; consumers: number; error?: string };
    minio: { status: string; objectCount: number; bytes: number; error?: string };
  };
  alerts: {
    total: number;
    newCount: number;
    last24h: number;
    highConfidenceLast24h: number;
    byLabel: Array<{ label: string; count: number }>;
    hourly: Array<{ hour: string; count: number }>;
  };
  cameras: {
    total: number;
    active: number;
  };
}
