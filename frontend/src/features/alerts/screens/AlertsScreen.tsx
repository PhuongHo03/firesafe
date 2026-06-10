"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/layouts/Sidebar";
import AlertsPagination from "@/features/alerts/components/AlertsPagination";
import AlertsTable from "@/features/alerts/components/AlertsTable";
import DeleteButton from "@/features/alerts/components/DeleteButton";
import { useAlerts } from "@/features/alerts/hooks/useAlerts";
import { RefreshCw } from "lucide-react";

export default function AlertsScreen() {
  const router = useRouter();
  const {
    alerts, total, page, setPage, totalPages,
    loading, error, refreshing, reload, resolveAlert, deleteAlert, deleteAllAlerts
  } = useAlerts();

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
            <DeleteButton
              id="delete-all-alerts-btn"
              disabled={total === 0}
              onClick={() => {
                if (confirm("Xóa tất cả cảnh báo?")) {
                  deleteAllAlerts();
                }
              }}
            >
              Xóa tất cả
            </DeleteButton>
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <AlertsTable alerts={alerts} loading={loading} onOpenAlert={id => router.push(`/alerts/${id}`)} onResolveAlert={resolveAlert} onDeleteAlert={deleteAlert} />
        <AlertsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
