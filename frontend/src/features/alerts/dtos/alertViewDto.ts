import { Alert } from "@/features/alerts/types/alert";
import { getAlertStatusText } from "@/shared/utils/alertStatus";
import { getApiUrl } from "@/shared/utils/http";

export function getAlertConfidenceColor(confidence: number) {
  return confidence >= 0.9 ? "var(--accent)" : confidence >= 0.75 ? "var(--yellow)" : "var(--green)";
}

export function getAlertLabelColor(label: string) {
  return label === "fire" ? "var(--accent)" : "var(--yellow)";
}

export { getAlertStatusText };

export function getAlertImageUrl(alert: Alert): string | null {
  if (!alert.imageUrl) return null;
  return getApiUrl(`/api/v1/alerts/${alert.id}/image`);
}
