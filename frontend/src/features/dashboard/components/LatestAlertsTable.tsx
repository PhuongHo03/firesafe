import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle } from "lucide-react";
import AlertBadge from "@/features/alerts/components/AlertBadge";
import { formatAlertDateTime, getAlertConfidenceColor } from "@/features/alerts/dtos/alertViewDto";
import { Alert } from "@/features/alerts/types/alert";

export default function LatestAlertsTable({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  const router = useRouter();
  return (
    <section style={{ ...sectionStyle, marginTop: "1.5rem" }}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>5 cảnh báo mới nhất</h2>
          <p style={sectionSubtitleStyle}>Quản lý đầy đủ ở trang Alerts</p>
        </div>
        <button onClick={() => router.push("/alerts")} style={secondaryBtn}>Xem tất cả</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>{["ID", "Camera", "Loại", "Độ tin cậy", "Thời gian", "Trạng thái"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={emptyTd}>Đang tải...</td></tr>
          ) : alerts.length === 0 ? (
            <tr><td colSpan={6} style={emptyTd}>Chưa có cảnh báo nào</td></tr>
          ) : alerts.map((alert, index) => (
            <tr key={alert.id} style={{ borderBottom: index < alerts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s" }} onClick={() => router.push(`/alerts/${alert.id}`)} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>#{alert.id}</span></td>
              <td style={td}>{alert.cameraName}</td>
              <td style={td}><AlertBadge label={alert.label} /></td>
              <td style={td}><span style={{ color: getAlertConfidenceColor(alert.confidence), fontWeight: 600 }}>{(alert.confidence * 100).toFixed(0)}%</span></td>
              <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{formatAlertDateTime(alert.detectedAt)}</span></td>
              <td style={td}>{alert.status === "NEW" ? <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)", fontSize: "0.85rem" }}><AlertTriangle size={13} /> Mới</span> : <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--green)", fontSize: "0.85rem" }}><CheckCircle size={13} /> Đã xử lý</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const sectionStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--border)" };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 700 };
const sectionSubtitleStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.8rem" };
const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
const secondaryBtn: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.45rem 0.8rem", color: "var(--text)", cursor: "pointer", fontSize: "0.85rem" };
