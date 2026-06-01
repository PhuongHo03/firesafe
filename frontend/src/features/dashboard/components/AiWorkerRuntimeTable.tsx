import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

export default function AiWorkerRuntimeTable({ metrics, loading }: { metrics: DashboardMetrics | null; loading: boolean }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>AI Worker runtime</h2>
          <p style={sectionSubtitleStyle}>Workers: {metrics?.aiWorker.workers ?? 0} · RTSP sources: {metrics?.aiWorker.sources ?? 0}</p>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>{["Camera", "Detect", "Frame", "Detections", "Alerts", "Inference"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={emptyTd}>Đang tải...</td></tr>
          ) : !metrics || metrics.aiWorker.cameras.length === 0 ? (
            <tr><td colSpan={6} style={emptyTd}>Chưa có camera đang detect</td></tr>
          ) : metrics.aiWorker.cameras.map(camera => (
            <tr key={camera.cameraId} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={td}>#{camera.cameraId}</td>
              <td style={td}><StatusPill ok={Boolean(camera.running)} on="Running" off="Stopped" /></td>
              <td style={td}><StatusPill ok={Boolean(camera.hasFrame)} on="OK" off="No frame" /></td>
              <td style={td}>{camera.detectionsTotal ?? 0}</td>
              <td style={td}>{camera.alertsSentTotal ?? 0}</td>
              <td style={td}>{(camera.inferenceMsAvg ?? 0).toFixed(0)}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StatusPill({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return <span style={{ color: ok ? "var(--green)" : "var(--text-muted)", fontSize: "0.85rem" }}>{ok ? on : off}</span>;
}

const sectionStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--border)" };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 700 };
const sectionSubtitleStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.8rem" };
const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
