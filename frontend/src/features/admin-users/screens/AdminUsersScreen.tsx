"use client";

import Sidebar from "@/layouts/Sidebar";
import UsersTable from "@/features/admin-users/components/UsersTable";
import { useAdminUsers } from "@/features/admin-users/hooks/useAdminUsers";
import { RefreshCw, Users } from "lucide-react";

export default function AdminUsersScreen() {
  const { users, currentEmail, loading, refreshing, error, reload, updateUser } = useAdminUsers();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={22} /> Quản lý người dùng
            </h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Kích hoạt tài khoản và chỉnh role Admin/Viewer
            </p>
          </div>
          <button onClick={reload} style={refreshBtn}>
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Làm mới
          </button>
        </div>

        {error && <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>{error}</div>}

        <UsersTable users={users} currentEmail={currentEmail} loading={loading} onUpdateUser={updateUser} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
