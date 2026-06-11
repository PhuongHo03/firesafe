import { request } from "@/shared/utils/http";
import { Alert } from "@/features/alerts/types/alert";

export const alertsApi = {
  getAlerts(page = 0, size = 20, token: string, cameraId?: number) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (cameraId !== undefined) {
      params.set("cameraId", String(cameraId));
    }
    return request<{
      content: Alert[];
      totalElements: number;
      totalPages: number;
    }>(`/api/v1/alerts?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getAlert(id: number, token: string) {
    return request<Alert>(`/api/v1/alerts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getNewAlertCount(token: string) {
    return request<{ newCount: number }>("/api/v1/alerts/new-count", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  resolveAlert(id: number, token: string) {
    return request<Alert>(`/api/v1/alerts/${id}/resolve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  resolveAllNewAlerts(token: string) {
    return request<{ resolvedCount: number }>("/api/v1/alerts/resolve-all", {
      method: "PATCH",
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
};
