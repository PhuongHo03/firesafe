import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthMessage from "@/features/auth/components/AuthMessage";
import { LoginFormState } from "@/features/auth/types/auth";

interface LoginFormProps {
  form: LoginFormState;
  error: string;
  loading: boolean;
  onFieldChange: (field: keyof LoginFormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginForm({ form, error, loading, onFieldChange, onSubmit }: LoginFormProps) {
  return (
    <>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Email công ty</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={e => onFieldChange("email", e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
            placeholder="admin@nhattienchung.vn"
          />
        </div>

        <div>
          <label style={labelStyle}>Mật khẩu</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={e => onFieldChange("password", e.target.value)}
            required
            autoComplete="current-password"
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        {error && <AuthMessage>{error}</AuthMessage>}

        <button id="login-submit" type="submit" disabled={loading} style={submitBtn(loading)}>
          {loading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <p style={{ margin: "1rem 0 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
        Chưa có tài khoản? <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Đăng ký tài khoản</Link>
      </p>
    </>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.4rem" };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", color: "var(--text)", fontSize: "0.95rem", outline: "none" };
const submitBtn = (loading: boolean): React.CSSProperties => ({ background: loading ? "var(--surface-2)" : "var(--accent)", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "1rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "opacity 0.2s", marginTop: "0.5rem" });
