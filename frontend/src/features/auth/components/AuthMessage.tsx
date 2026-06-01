export default function AuthMessage({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  const success = tone === "success";
  return (
    <div style={{
      background: success ? "rgba(34, 197, 94, 0.12)" : "var(--accent-dim)",
      border: `1px solid ${success ? "var(--green)" : "var(--accent)"}`,
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      color: success ? "var(--green)" : "var(--accent)",
    }}>
      {children}
    </div>
  );
}
