import { getAlertLabelColor } from "@/features/alerts/dtos/alertViewDto";

export default function AlertBadge({ label }: { label: string }) {
  const color = getAlertLabelColor(label);
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}55`,
      borderRadius: "0.25rem",
      padding: "0.15rem 0.5rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      textTransform: "uppercase",
    }}>{label}</span>
  );
}
