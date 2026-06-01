import { AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import AlertBadge from "@/features/alerts/components/AlertBadge";
import { formatAlertDateTime, getAlertConfidenceColor } from "@/features/alerts/dtos/alertViewDto";
import { Alert } from "@/features/alerts/types/alert";

interface AlertsTableProps {
  alerts: Alert[];
  admin: boolean;
  loading: boolean;
  onOpenAlert: (id: number) => void;
  onDeleteAlert: (id: number) => void;
}

export default function AlertsTable({ alerts, admin, loading, onOpenAlert, onDeleteAlert }: AlertsTableProps) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["ID", "Camera", "Loại", "Độ tin cậy", "Thời gian", "Trạng thái", ...(admin ? ["Xóa"] : [])].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={emptyTd}>Đang tải...</td></tr>
          ) : alerts.length === 0 ? (
            <tr><td colSpan={7} style={emptyTd}>Chưa có cảnh báo nào</td></tr>
          ) : alerts.map((alert, index) => (
            <tr
              key={alert.id}
              style={{ borderBottom: index < alerts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s" }}
              onClick={() => onOpenAlert(alert.id)}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>#{alert.id}</span></td>
              <td style={td}>{alert.cameraName}</td>
              <td style={td}><AlertBadge label={alert.label} /></td>
              <td style={td}>
                <span style={{ color: getAlertConfidenceColor(alert.confidence), fontWeight: 600 }}>
                  {(alert.confidence * 100).toFixed(0)}%
                </span>
              </td>
              <td style={td}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {formatAlertDateTime(alert.detectedAt)}
                </span>
              </td>
              <td style={td}>
                {alert.status === "NEW"
                  ? <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)", fontSize: "0.85rem" }}><AlertTriangle size={13} /> Mới</span>
                  : <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--green)", fontSize: "0.85rem" }}><CheckCircle size={13} /> Đã xử lý</span>
                }
              </td>
              {admin && (
                <td style={td}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Xóa cảnh báo #${alert.id}?`)) {
                        onDeleteAlert(alert.id);
                      }
                    }}
                    style={deleteBtn}
                    title="Xóa cảnh báo"
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
const deleteBtn: React.CSSProperties = { background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.4rem", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.6rem", fontSize: "0.8rem" };
