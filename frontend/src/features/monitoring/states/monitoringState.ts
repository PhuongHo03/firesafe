import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

export const MONITORING_REFRESH_MS = 10_000;
export const MONITORING_LOAD_ERROR = "Không thể tải metrics hệ thống";

export interface MonitoringState {
  metrics: DashboardMetrics | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export const INITIAL_MONITORING_STATE: MonitoringState = {
  metrics: null,
  loading: true,
  refreshing: false,
  error: null,
};
