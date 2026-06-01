import { useAlerts } from "@/features/alerts/hooks/useAlerts";
import { DASHBOARD_ALERT_LIMIT } from "@/features/dashboard/states/dashboardState";
import { useMonitoring } from "@/features/monitoring/hooks/useMonitoring";

export function useDashboard() {
  const alertsState = useAlerts(DASHBOARD_ALERT_LIMIT);
  const monitoring = useMonitoring();

  function reloadAll() {
    alertsState.reload();
    monitoring.reload();
  }

  return {
    alertsState,
    monitoring,
    metrics: monitoring.metrics,
    error: alertsState.error ?? monitoring.error,
    refreshing: alertsState.refreshing || monitoring.refreshing,
    reloadAll,
  };
}
