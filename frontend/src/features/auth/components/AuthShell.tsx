import { Flame } from "lucide-react";
import { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  maxWidth?: string;
  children: ReactNode;
}

export default function AuthShell({ title, subtitle, maxWidth = "400px", children }: AuthShellProps) {
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
        maxWidth,
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
            {title}
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {subtitle}
          </p>
        </div>

        {children}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
