import { request } from "@/shared/utils/http";
import { Alert } from "@/features/alerts/types/alert";

export const alertsApi = {
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
};
