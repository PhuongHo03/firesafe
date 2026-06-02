import { Alert } from "@/features/alerts/types/alert";

export function getAlertConfidenceColor(confidence: number) {
  return confidence >= 0.9 ? "var(--accent)" : confidence >= 0.75 ? "var(--yellow)" : "var(--green)";
}

export function getAlertLabelColor(label: string) {
  return label === "fire" ? "var(--accent)" : "var(--yellow)";
}

export function getAlertStatusText(status: Alert["status"]) {
  return status === "NEW" ? "Mới" : "Đã xử lý";
}

export function formatAlertDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

export function replaceMinIOInternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\/minio:9000/, "");
}
