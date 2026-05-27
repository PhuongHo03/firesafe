"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAlert } from "@/hooks/useAlert";
import { isAdmin } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Flame, Camera, Clock, Tag, Trash2 } from "lucide-react";

const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

export default function AlertDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { alert, loading, error, deleteAlert } = useAlert(id);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

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
              {admin && (
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
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Image */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {alert.imageUrl ? (
                  <img src={alert.imageUrl} alt="Hiện trường" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                ) : (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Không có ảnh</span>
                )}
              </div>

              {/* Info */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <InfoRow icon={<Camera size={16} />} label="Camera" value={alert.cameraName} />
                <InfoRow icon={<Tag size={16} />} label="Loại cảnh báo" value={alert.label.toUpperCase()} color="var(--accent)" />
                <InfoRow icon={<Flame size={16} />} label="Độ tin cậy" value={`${(alert.confidence * 100).toFixed(1)}%`} color={alert.confidence >= 0.9 ? "var(--accent)" : "var(--yellow)"} />
                <InfoRow icon={<Clock size={16} />} label="Thời gian phát hiện" value={formatDateTime(alert.detectedAt)} />
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

            {/* Raw image URL */}
            {alert.imageUrl && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem 1.25rem" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>URL ảnh</div>
                <a href={alert.imageUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: "0.85rem", wordBreak: "break-all" }}>
                  {alert.imageUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const deleteBtn: React.CSSProperties = {
  background: "var(--accent-dim)",
  border: "1px solid var(--accent)",
  borderRadius: "0.4rem",
  color: "var(--accent)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.45rem 0.8rem",
  fontSize: "0.85rem",
};

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
