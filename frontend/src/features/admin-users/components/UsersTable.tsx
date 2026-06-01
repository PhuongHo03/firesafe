import { Shield } from "lucide-react";
import { getUserRole } from "@/features/admin-users/dtos/userUpdateDto";
import { Role, UserAccount, UserUpdateInput } from "@/features/admin-users/types/user";

const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

interface UsersTableProps {
  users: UserAccount[];
  currentEmail: string;
  loading: boolean;
  onUpdateUser: (user: UserAccount, input: UserUpdateInput) => void;
}

export default function UsersTable({ users, currentEmail, loading, onUpdateUser }: UsersTableProps) {
  return (
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
            const role = getUserRole(user);
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
                    <input type="checkbox" checked={user.active} disabled={isSelf} onChange={e => onUpdateUser(user, { active: e.target.checked })} />
                    {user.active ? "Active" : "Pending"}{isSelf ? " (Bạn)" : ""}
                  </label>
                </td>
                <td style={td}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <Shield size={14} color={role === "ROLE_ADMIN" ? "var(--accent)" : "var(--text-muted)"} />
                    <select value={role} disabled={isSelf} onChange={e => onUpdateUser(user, { role: e.target.value as Role })} style={selectStyle}>
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
  );
}

const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
const selectStyle: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.35rem 0.5rem", color: "var(--text)", outline: "none" };
