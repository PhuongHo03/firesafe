"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { Flame, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(username, password);
      saveAuth(data);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
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
        maxWidth: "400px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
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
            FireSafe
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Hệ thống phát hiện cháy
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Tên đăng nhập
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={inputStyle}
              placeholder="admin"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

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
            id="login-submit"
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
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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
