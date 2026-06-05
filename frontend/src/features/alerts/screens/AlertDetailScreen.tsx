"use client";

import { useRouter, useParams } from "next/navigation";
import AlertDetailCard from "@/features/alerts/components/AlertDetailCard";
import { useAlert } from "@/features/alerts/hooks/useAlert";
import Sidebar from "@/layouts/Sidebar";
import { ArrowLeft, Flame, Trash2 } from "lucide-react";

export default function AlertDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { alert, loading, error, deleteAlert } = useAlert(id);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <button id="back-btn" onClick={() => router.back()} style={{
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "1.5rem",
          fontSize: "0.875rem",
          padding: 0,
        }}>
          <ArrowLeft size={16} /> Quay lại
        </button>

        {loading && <p style={{ color: "var(--text-muted)" }}>Đang tải...</p>}
        {error && <p style={{ color: "var(--accent)" }}>{error}</p>}

        {alert && (
          <div style={{ display: "grid", gap: "1.5rem", maxWidth: "900px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Flame size={20} color="var(--accent)" /> Cảnh báo #{alert.id}
              </h1>
              <button
                onClick={() => {
                  if (confirm(`Xóa cảnh báo #${alert.id}?`)) {
                    deleteAlert();
                  }
                }}
                style={deleteBtn}
              >
                <Trash2 size={14} /> Xóa
              </button>
            </div>

            <AlertDetailCard alert={alert} />
          </div>
        )}
      </main>
    </div>
  );
}

const deleteBtn: React.CSSProperties = { background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.4rem", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.8rem", fontSize: "0.85rem" };
