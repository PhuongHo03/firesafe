import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthMessage from "@/features/auth/components/AuthMessage";
import { ALLOWED_EMAIL_DOMAIN } from "@/features/auth/states/authFormState";
import { RegisterFormState } from "@/features/auth/types/auth";

interface RegisterFormProps {
  form: RegisterFormState;
  error: string;
  success: boolean;
  loading: boolean;
  onFieldChange: (field: keyof RegisterFormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function RegisterForm({ form, error, success, loading, onFieldChange, onSubmit }: RegisterFormProps) {
  return (
    <>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Tên tài khoản</label>
          <input id="username" type="text" value={form.username} onChange={e => onFieldChange("username", e.target.value)} required maxLength={100} autoComplete="name" style={inputStyle} placeholder="Nguyễn Văn A" />
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input id="email" type="email" value={form.email} onChange={e => onFieldChange("email", e.target.value)} required autoComplete="email" style={inputStyle} placeholder={`user${ALLOWED_EMAIL_DOMAIN}`} />
        </div>

        <div>
          <label style={labelStyle}>Mật khẩu</label>
          <input id="password" type="password" value={form.password} onChange={e => onFieldChange("password", e.target.value)} required minLength={6} autoComplete="new-password" style={inputStyle} placeholder="••••••••" />
        </div>

        <div>
          <label style={labelStyle}>Xác nhận mật khẩu</label>
          <input id="confirm-password" type="password" value={form.confirmPassword} onChange={e => onFieldChange("confirmPassword", e.target.value)} required minLength={6} autoComplete="new-password" style={inputStyle} placeholder="••••••••" />
        </div>

        {success && <AuthMessage tone="success">Đăng ký tài khoản thành công! Vui lòng chờ Ban quản trị kích hoạt tài khoản của bạn trước khi đăng nhập.</AuthMessage>}
        {error && <AuthMessage>{error}</AuthMessage>}

        <button id="register-submit" type="submit" disabled={loading} style={submitBtn(loading)}>
          {loading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>

      <p style={{ margin: "1rem 0 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
        Đã có tài khoản? <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Đăng nhập</Link>
      </p>
    </>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.4rem" };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", color: "var(--text)", fontSize: "0.95rem", outline: "none" };
const submitBtn = (loading: boolean): React.CSSProperties => ({ background: loading ? "var(--surface-2)" : "var(--accent)", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "1rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "opacity 0.2s", marginTop: "0.5rem" });
