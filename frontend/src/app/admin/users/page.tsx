"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api, UserAccount } from "@/lib/api";
import { getToken, getUser, isAdmin } from "@/lib/auth";
import { RefreshCw, Shield, Users } from "lucide-react";

type Role = "ROLE_ADMIN" | "ROLE_VIEWER";

const MIN_REFRESH_MS = 250;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

export default function AdminUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (!token) return;
    if (showLoading) setLoading(true);
    setError("");
    try {
      setUsers(await api.getUsers(token));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách user");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(false), wait(MIN_REFRESH_MS)]);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    const currentToken = getToken() ?? null;
    setCurrentEmail(getUser()?.email ?? "");
    setToken(currentToken);
    if (!currentToken) {
      router.push("/login");
      return;
    }
    if (!isAdmin()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateUser(user: UserAccount, data: { active?: boolean; role?: Role }) {
    if (!token) return;
    const nextRole = data.role ?? (user.roles.includes("ROLE_ADMIN") ? "ROLE_ADMIN" : "ROLE_VIEWER");
    const nextActive = data.active ?? user.active;
    setError("");
    try {
      const updated = await api.updateUser(user.id, { active: nextActive, role: nextRole }, token);
      setUsers(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật user");
    }
  }

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

        <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["User", "Email", "Trạng thái", "Role", "Tạo lúc"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={emptyTd}>Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={emptyTd}>Chưa có user</td></tr>
              ) : users.map(user => {
                const role = user.roles.includes("ROLE_ADMIN") ? "ROLE_ADMIN" : "ROLE_VIEWER";
                const isSelf = user.email === currentEmail;
                return (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{user.username}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>#{user.id}</div>
                    </td>
                    <td style={td}>{user.email}</td>
                    <td style={td}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", color: user.active ? "var(--green)" : "var(--yellow)", cursor: "pointer" }}>
                        <input type="checkbox" checked={user.active} disabled={isSelf} onChange={e => updateUser(user, { active: e.target.checked })} />
                        {user.active ? "Active" : "Pending"}{isSelf ? " (Bạn)" : ""}
                      </label>
                    </td>
                    <td style={td}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                        <Shield size={14} color={role === "ROLE_ADMIN" ? "var(--accent)" : "var(--text-muted)"} />
                        <select value={role} disabled={isSelf} onChange={e => updateUser(user, { role: e.target.value as Role })} style={selectStyle}>
                          <option value="ROLE_VIEWER">Viewer</option>
                          <option value="ROLE_ADMIN">Admin</option>
                        </select>
                      </label>
                    </td>
                    <td style={td}>{formatDateTime(user.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
const selectStyle: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.35rem 0.5rem", color: "var(--text)", outline: "none" };
