"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Flame, Loader2 } from "lucide-react";

const ALLOWED_DOMAIN = "@nhattienchung.vn";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedUsername) {
      setError("Tên tài khoản không được để trống");
      return;
    }
    if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
      setError(`Email phải dùng tên miền ${ALLOWED_DOMAIN}`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      await api.register(normalizedUsername, normalizedEmail, password);
      setSuccess(true);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "1rem",
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "1rem",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "64px",
            height: "64px",
            background: "var(--accent-dim)",
            borderRadius: "1rem",
            marginBottom: "1rem",
          }}>
            <Flame size={32} color="var(--accent)" />
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
            Tạo tài khoản
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Chỉ email {ALLOWED_DOMAIN} được đăng ký
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Tên tài khoản</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
              style={inputStyle}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder={`user${ALLOWED_DOMAIN}`}
            />
          </div>

          <div>
            <label style={labelStyle}>Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={labelStyle}>Xác nhận mật khẩu</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {success && (
            <div style={{
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid var(--green)",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              color: "var(--green)",
            }}>
              Đăng ký tài khoản thành công! Vui lòng chờ Ban quản trị kích hoạt tài khoản của bạn trước khi đăng nhập.
            </div>
          )}

          {error && (
            <div style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent)",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              color: "var(--accent)",
            }}>
              {error}
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "var(--surface-2)" : "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "opacity 0.2s",
              marginTop: "0.5rem",
            }}
          >
            {loading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p style={{ margin: "1rem 0 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          Đã có tài khoản? <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Đăng nhập</Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  color: "var(--text-muted)",
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.625rem 0.875rem",
  color: "var(--text)",
  fontSize: "0.95rem",
  outline: "none",
};
