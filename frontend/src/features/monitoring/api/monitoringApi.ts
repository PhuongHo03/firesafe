import { request } from "@/shared/utils/http";
import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

export const monitoringApi = {
  getDashboardMetrics(token: string) {
    return request<DashboardMetrics>("/api/admin/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
