import { Camera, Clock, Flame, Tag } from "lucide-react";
import { formatAlertDateTime } from "@/features/alerts/dtos/alertViewDto";
import { Alert } from "@/features/alerts/types/alert";

export default function AlertDetailCard({ alert }: { alert: Alert }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {alert.imageUrl ? (
          <img src={alert.imageUrl} alt="Hiện trường" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Không có ảnh</span>
        )}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <InfoRow icon={<Camera size={16} />} label="Camera" value={alert.cameraName} />
        <InfoRow icon={<Tag size={16} />} label="Loại cảnh báo" value={alert.label.toUpperCase()} color="var(--accent)" />
        <InfoRow icon={<Flame size={16} />} label="Độ tin cậy" value={`${(alert.confidence * 100).toFixed(1)}%`} color={alert.confidence >= 0.9 ? "var(--accent)" : "var(--yellow)"} />
        <InfoRow icon={<Clock size={16} />} label="Thời gian phát hiện" value={formatAlertDateTime(alert.detectedAt)} />
        <div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>TRẠNG THÁI</span>
          <div style={{
            marginTop: "0.3rem",
            display: "inline-block",
            background: alert.status === "NEW" ? "var(--accent-dim)" : "rgba(34,197,94,0.15)",
            color: alert.status === "NEW" ? "var(--accent)" : "var(--green)",
            border: `1px solid ${alert.status === "NEW" ? "var(--accent)" : "var(--green)"}44`,
            borderRadius: "0.4rem",
            padding: "0.25rem 0.75rem",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}>
            {alert.status === "NEW" ? "🔴 Mới" : "✅ Đã xử lý"}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
        {icon} {label}
      </div>
      <div style={{ fontWeight: 600, color: color ?? "var(--text)" }}>{value}</div>
    </div>
  );
}
