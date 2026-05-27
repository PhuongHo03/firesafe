"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAlerts } from "@/hooks/useAlerts";
import { isAdmin } from "@/lib/auth";
import { AlertTriangle, CheckCircle, RefreshCw, Trash2 } from "lucide-react";

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.9 ? "var(--accent)" : c >= 0.75 ? "var(--yellow)" : "var(--green)";
const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

function Badge({ label }: { label: string }) {
  const color = label === "fire" ? "var(--accent)" : "var(--yellow)";
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

export default function AlertsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const {
    alerts, total, page, setPage, totalPages,
    loading, error, refreshing, reload, deleteAlert, deleteAllAlerts
  } = useAlerts();

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Alerts</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {total} cảnh báo đã ghi nhận
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button id="alerts-refresh-btn" onClick={reload} style={refreshBtn}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              Làm mới
            </button>
            {admin && (
              <button
                id="delete-all-alerts-btn"
                disabled={total === 0}
                onClick={() => {
                  if (confirm("Xóa tất cả cảnh báo?")) {
                    deleteAllAlerts();
                  }
                }}
                style={{ ...deleteBtn, opacity: total === 0 ? 0.5 : 1, cursor: total === 0 ? "not-allowed" : "pointer" }}
              >
                <Trash2 size={14} /> Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["ID", "Camera", "Loại", "Độ tin cậy", "Thời gian", "Trạng thái", ...(admin ? ["Xóa"] : [])].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Đang tải...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Chưa có cảnh báo nào</td></tr>
              ) : alerts.map((a, i) => (
                <tr
                  key={a.id}
                  style={{ borderBottom: i < alerts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s" }}
                  onClick={() => router.push(`/alerts/${a.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>#{a.id}</span></td>
                  <td style={td}>{a.cameraName}</td>
                  <td style={td}><Badge label={a.label} /></td>
                  <td style={td}>
                    <span style={{ color: CONFIDENCE_COLOR(a.confidence), fontWeight: 600 }}>
                      {(a.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {formatDateTime(a.detectedAt)}
                    </span>
                  </td>
                  <td style={td}>
                    {a.status === "NEW"
                      ? <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)", fontSize: "0.85rem" }}><AlertTriangle size={13} /> Mới</span>
                      : <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--green)", fontSize: "0.85rem" }}><CheckCircle size={13} /> Đã xử lý</span>
                    }
                  </td>
                  {admin && (
                    <td style={td}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Xóa cảnh báo #${a.id}?`)) {
                            deleteAlert(a.id);
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

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button id="alerts-page-prev" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={pageBtn(page === 0)}>← Trước</button>
            <span style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Trang {page + 1} / {totalPages}
            </span>
            <button id="alerts-page-next" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={pageBtn(page >= totalPages - 1)}>Tiếp →</button>
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const refreshBtn: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.5rem 1rem",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  fontSize: "0.875rem",
};
const deleteBtn: React.CSSProperties = {
  background: "var(--accent-dim)",
  border: "1px solid var(--accent)",
  borderRadius: "0.4rem",
  color: "var(--accent)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.35rem 0.6rem",
  fontSize: "0.8rem",
};
const pageBtn = (disabled: boolean): React.CSSProperties => ({
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.5rem 1rem",
  color: disabled ? "var(--text-muted)" : "var(--text)",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.875rem",
  opacity: disabled ? 0.5 : 1,
});
