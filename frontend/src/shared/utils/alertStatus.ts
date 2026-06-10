export type AlertStatus = "NEW" | "RESOLVED";

export function isNewAlertStatus(status: AlertStatus) {
  return status === "NEW";
}

export function getAlertStatusText(status: AlertStatus) {
  return status === "NEW" ? "Mới" : "Đã xử lý";
}

export function getAlertStatusColor(status: AlertStatus) {
  return status === "NEW" ? "var(--accent)" : "var(--green)";
}

export function getAlertStatusBackground(status: AlertStatus) {
  return status === "NEW" ? "var(--accent-dim)" : "rgba(34,197,94,0.15)";
}
