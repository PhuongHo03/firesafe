import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

export function normalizeDashboardMetrics(metrics: DashboardMetrics): DashboardMetrics {
  return metrics;
}

export function toMonitoringError() {
  return "Không thể tải metrics hệ thống";
}
