import { AlertTriangle, CheckCircle } from "lucide-react";
import { AlertStatus, getAlertStatusText, isNewAlertStatus } from "@/shared/utils/alertStatus";
import { formatVietnamDateTime } from "@/shared/utils/date";

export interface AlertEventsTableItem {
  id: number;
  cameraName: string;
  cameraLocation?: string | null;
  label: string;
  confidence: number;
  detectedAt: string;
  status: AlertStatus;
}

interface AlertEventsTableProps<T extends AlertEventsTableItem> {
  alerts: T[];
  loading: boolean;
  onOpenAlert: (id: number) => void;
  renderActions?: (alert: T) => React.ReactNode;
}

export default function AlertEventsTable<T extends AlertEventsTableItem>({ alerts, loading, onOpenAlert, renderActions }: AlertEventsTableProps<T>) {
  const headers = ["ID", "Camera", "Location", "Loại", "Độ tin cậy", "Thời gian", "Trạng thái"];
  if (renderActions) headers.push("Thao tác");

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {headers.map(header => (
            <th key={header} style={th}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={headers.length} style={emptyTd}>Đang tải...</td></tr>
        ) : alerts.length === 0 ? (
          <tr><td colSpan={headers.length} style={emptyTd}>Chưa có cảnh báo nào</td></tr>
        ) : alerts.map((alert, index) => (
          <tr
            key={alert.id}
            style={{ borderBottom: index < alerts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s" }}
            onClick={() => onOpenAlert(alert.id)}
            onMouseEnter={event => (event.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={event => (event.currentTarget.style.background = "transparent")}
          >
            <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>#{alert.id}</span></td>
            <td style={td}>{alert.cameraName}</td>
            <td style={td}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {alert.cameraLocation || "Không xác định"}
              </span>
            </td>
            <td style={td}><AlertLabelBadge label={alert.label} /></td>
            <td style={td}>
              <span style={{ color: getAlertConfidenceColor(alert.confidence), fontWeight: 600 }}>
                {(alert.confidence * 100).toFixed(0)}%
              </span>
            </td>
            <td style={td}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {formatVietnamDateTime(alert.detectedAt)}
              </span>
            </td>
            <td style={td}>
              {isNewAlertStatus(alert.status)
                ? <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)", fontSize: "0.85rem" }}><AlertTriangle size={13} /> {getAlertStatusText(alert.status)}</span>
                : <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--green)", fontSize: "0.85rem" }}><CheckCircle size={13} /> {getAlertStatusText(alert.status)}</span>
              }
            </td>
            {renderActions && <td style={td}>{renderActions(alert)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlertLabelBadge({ label }: { label: string }) {
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

function getAlertConfidenceColor(confidence: number) {
  return confidence >= 0.9 ? "var(--accent)" : confidence >= 0.75 ? "var(--yellow)" : "var(--green)";
}

function getAlertLabelColor(label: string) {
  return label === "fire" ? "var(--accent)" : "var(--yellow)";
}

const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
