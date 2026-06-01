"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/layouts/Sidebar";
import AlertsPagination from "@/features/alerts/components/AlertsPagination";
import AlertsTable from "@/features/alerts/components/AlertsTable";
import { useAlerts } from "@/features/alerts/hooks/useAlerts";
import { isAdmin } from "@/shared/utils/auth";
import { RefreshCw, Trash2 } from "lucide-react";

export default function AlertsScreen() {
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

        <AlertsTable alerts={alerts} admin={admin} loading={loading} onOpenAlert={id => router.push(`/alerts/${id}`)} onDeleteAlert={deleteAlert} />
        <AlertsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
const deleteBtn: React.CSSProperties = { background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.4rem", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.6rem", fontSize: "0.8rem" };
