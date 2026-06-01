import { ChartDatum } from "@/features/dashboard/types/dashboard";
import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

export function getStatusColor(status?: string) {
  return status === "UP" ? "var(--green)" : "var(--accent)";
}

export function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatBytesPair(used: number, total: number) {
  return `${formatBytes(used)} / ${formatBytes(total)}`;
}

export function percent(used: number, total: number) {
  return total > 0 ? used / total * 100 : 0;
}

export function hourlyChartData(metrics: DashboardMetrics | null): ChartDatum[] {
  return metrics?.alerts.hourly.map(item => ({ label: item.hour, value: item.count })) ?? [];
}

export function labelChartData(metrics: DashboardMetrics | null): ChartDatum[] {
  return metrics?.alerts.byLabel.map(item => ({ label: item.label, value: item.count })) ?? [];
}
