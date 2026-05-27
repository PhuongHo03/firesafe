"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAlerts } from "@/hooks/useAlerts";
import { useMonitoring } from "@/hooks/useMonitoring";
import { AlertTriangle, BarChart3, Camera, CheckCircle, Cpu, Database, Flame, Gauge, HardDrive, ListChecks, RefreshCw, Server, Wifi } from "lucide-react";

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.9 ? "var(--accent)" : c >= 0.75 ? "var(--yellow)" : "var(--green)";
const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

function Badge({ label }: { label: string }) {
  const color = label === "fire" ? "var(--accent)" : "var(--yellow)";
  return <span style={{ background: `${color}22`, color, border: `1px solid ${color}55`, borderRadius: "0.25rem", padding: "0.15rem 0.5rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>{label}</span>;
}

export default function DashboardPage() {
  const router = useRouter();
  const alertsState = useAlerts(5);
  const monitoring = useMonitoring();
  const metrics = monitoring.metrics;
  const latestAlert = alertsState.alerts[0];

  function reloadAll() {
    alertsState.reload();
    monitoring.reload();
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Flame size={22} color="var(--accent)" /> Dashboard
            </h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Monitoring tổng quan từ monitoring service
            </p>
          </div>
          <button id="refresh-btn" onClick={reloadAll} style={refreshBtn}>
            <RefreshCw size={14} style={{ animation: alertsState.refreshing || monitoring.refreshing ? "spin 1s linear infinite" : "none" }} />
            Làm mới
          </button>
        </div>

        {(alertsState.error || monitoring.error) && (
          <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>
            {alertsState.error ?? monitoring.error}
          </div>
        )}

        <div style={grid4}>
          <SummaryCard icon={<Server size={18} />} label="Backend" value={metrics?.backend.status ?? "..."} color={metrics?.backend.status === "UP" ? "var(--green)" : "var(--accent)"} />
          <SummaryCard icon={<Cpu size={18} />} label="AI Worker" value={metrics?.aiWorker.status ?? "..."} color={metrics?.aiWorker.status === "UP" ? "var(--green)" : "var(--accent)"} />
          <SummaryCard icon={<Camera size={18} />} label="Camera active" value={`${metrics?.cameras.active ?? 0}/${metrics?.cameras.total ?? 0}`} />
          <SummaryCard icon={<ListChecks size={18} />} label="Tổng cảnh báo" value={(metrics?.alerts.total ?? alertsState.total).toString()} />
        </div>

        <div style={grid4}>
          <MetricCard icon={<Gauge size={18} />} label="CPU" value={`${(metrics?.system.cpuPct ?? 0).toFixed(0)}%`} percent={metrics?.system.cpuPct ?? 0} />
          <MetricCard icon={<Database size={18} />} label="RAM" value={formatBytesPair(metrics?.system.ramUsedBytes ?? 0, metrics?.system.ramTotalBytes ?? 0)} percent={percent(metrics?.system.ramUsedBytes ?? 0, metrics?.system.ramTotalBytes ?? 0)} />
          <MetricCard icon={<HardDrive size={18} />} label="Disk" value={formatBytesPair(metrics?.system.diskUsedBytes ?? 0, metrics?.system.diskTotalBytes ?? 0)} percent={percent(metrics?.system.diskUsedBytes ?? 0, metrics?.system.diskTotalBytes ?? 0)} />
          <MetricCard icon={<Cpu size={18} />} label="GPU" value={metrics?.system.gpu.available ? `${metrics.system.gpu.utilPct}%` : "N/A"} percent={metrics?.system.gpu.available ? metrics.system.gpu.utilPct : 0} detail={metrics?.system.gpu.available ? formatBytesPair(metrics.system.gpu.memoryUsedBytes, metrics.system.gpu.memoryTotalBytes) : undefined} />
        </div>

        <div style={grid4}>
          <SummaryCard icon={<Wifi size={18} />} label="API avg latency" value={`${(metrics?.backend.avgLatencyMs ?? 0).toFixed(0)}ms`} />
          <SummaryCard icon={<AlertTriangle size={18} />} label="API error rate" value={`${((metrics?.backend.errorRate ?? 0) * 100).toFixed(1)}%`} color={(metrics?.backend.errorRate ?? 0) > 0 ? "var(--accent)" : "var(--green)"} />
          <SummaryCard icon={<BarChart3 size={18} />} label="Requests" value={(metrics?.backend.requestsTotal ?? 0).toFixed(0)} />
          <SummaryCard icon={<Server size={18} />} label="Uptime" value={formatDuration(metrics?.backend.uptimeSeconds ?? 0)} />
        </div>

        <div style={grid4}>
          <SummaryCard icon={<Database size={18} />} label="Redis" value={metrics?.infra.redis.status ?? "..."} color={metrics?.infra.redis.status === "UP" ? "var(--green)" : "var(--accent)"} detail={`${metrics?.infra.redis.keyCount ?? 0} keys · ${formatBytes(metrics?.infra.redis.usedMemoryBytes ?? 0)}`} />
          <SummaryCard icon={<Database size={18} />} label="RabbitMQ" value={metrics?.infra.rabbitmq.status ?? "..."} color={metrics?.infra.rabbitmq.status === "UP" ? "var(--green)" : "var(--accent)"} detail={`${metrics?.infra.rabbitmq.messages ?? 0} msg · ${metrics?.infra.rabbitmq.consumers ?? 0} consumers`} />
          <SummaryCard icon={<HardDrive size={18} />} label="MinIO" value={metrics?.infra.minio.status ?? "..."} color={metrics?.infra.minio.status === "UP" ? "var(--green)" : "var(--accent)"} detail={`${metrics?.infra.minio.objectCount ?? 0} objects · ${formatBytes(metrics?.infra.minio.bytes ?? 0)}`} />
          <SummaryCard icon={<AlertTriangle size={18} />} label="Alert mới" value={(metrics?.alerts.newCount ?? 0).toString()} color="var(--accent)" detail={`${metrics?.alerts.last24h ?? 0} trong 24h`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <ChartCard title="Alerts theo giờ" subtitle="24 giờ gần nhất" data={metrics?.alerts.hourly.map(item => ({ label: item.hour, value: item.count })) ?? []} />
          <ChartCard title="Alerts theo loại" subtitle="fire / smoke" data={metrics?.alerts.byLabel.map(item => ({ label: item.label, value: item.count })) ?? []} />
        </div>

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
              {monitoring.loading ? (
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

        <section style={{ ...sectionStyle, marginTop: "1.5rem" }}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>5 cảnh báo mới nhất</h2>
              <p style={sectionSubtitleStyle}>Quản lý đầy đủ ở trang Alerts</p>
            </div>
            <button onClick={() => router.push("/alerts")} style={secondaryBtn}>Xem tất cả</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>{["ID", "Camera", "Loại", "Độ tin cậy", "Thời gian", "Trạng thái"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {alertsState.loading ? (
                <tr><td colSpan={6} style={emptyTd}>Đang tải...</td></tr>
              ) : alertsState.alerts.length === 0 ? (
                <tr><td colSpan={6} style={emptyTd}>Chưa có cảnh báo nào</td></tr>
              ) : alertsState.alerts.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < alertsState.alerts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s" }} onClick={() => router.push(`/alerts/${a.id}`)} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>#{a.id}</span></td>
                  <td style={td}>{a.cameraName}</td>
                  <td style={td}><Badge label={a.label} /></td>
                  <td style={td}><span style={{ color: CONFIDENCE_COLOR(a.confidence), fontWeight: 600 }}>{(a.confidence * 100).toFixed(0)}%</span></td>
                  <td style={td}><span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{formatDateTime(a.detectedAt)}</span></td>
                  <td style={td}>{a.status === "NEW" ? <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)", fontSize: "0.85rem" }}><AlertTriangle size={13} /> Mới</span> : <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--green)", fontSize: "0.85rem" }}><CheckCircle size={13} /> Đã xử lý</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SummaryCard({ icon, label, value, color, detail }: { icon: React.ReactNode; label: string; value: string; color?: string; detail?: string }) {
  return <div style={cardStyle}><div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: color ?? "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{icon} {label}</div><div style={{ fontSize: "1.5rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>{detail && <div style={{ marginTop: "0.35rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>{detail}</div>}</div>;
}

function MetricCard({ icon, label, value, percent, detail }: { icon: React.ReactNode; label: string; value: string; percent: number; detail?: string }) {
  const safe = Math.max(0, Math.min(100, percent));
  return <div style={cardStyle}><div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{icon} {label}</div><div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>{detail && <div style={{ marginTop: "0.35rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>{detail}</div>}<div style={{ height: 8, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden", marginTop: "0.75rem" }}><div style={{ width: `${safe}%`, height: "100%", background: safe > 85 ? "var(--accent)" : safe > 65 ? "var(--yellow)" : "var(--green)" }} /></div></div>;
}

function ChartCard({ title, subtitle, data }: { title: string; subtitle: string; data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map(item => item.value));
  return <section style={{ ...sectionStyle, padding: "1rem" }}><h2 style={sectionTitleStyle}>{title}</h2><p style={sectionSubtitleStyle}>{subtitle}</p><div style={{ display: "flex", alignItems: "end", gap: "0.35rem", height: 160, marginTop: "1rem" }}>{data.length === 0 ? <div style={emptyTd}>Chưa có dữ liệu</div> : data.map(item => <div key={item.label} title={`${item.label}: ${item.value}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}><div style={{ width: "100%", minHeight: 3, height: `${Math.max(3, item.value / max * 120)}px`, background: "linear-gradient(180deg, var(--accent), var(--yellow))", borderRadius: "0.25rem 0.25rem 0 0" }} /><span style={{ color: "var(--text-muted)", fontSize: "0.68rem", writingMode: data.length > 10 ? "vertical-rl" : "horizontal-tb" }}>{item.label}</span></div>)}</div></section>;
}

function StatusPill({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return <span style={{ color: ok ? "var(--green)" : "var(--text-muted)", fontSize: "0.85rem" }}>{ok ? on : off}</span>;
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatBytesPair(used: number, total: number) {
  return `${formatBytes(used)} / ${formatBytes(total)}`;
}

function percent(used: number, total: number) {
  return total > 0 ? used / total * 100 : 0;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem", marginBottom: "1rem" };
const cardStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem" };
const sectionStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--border)" };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 700 };
const sectionSubtitleStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.8rem" };
const th: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
const secondaryBtn: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.45rem 0.8rem", color: "var(--text)", cursor: "pointer", fontSize: "0.85rem" };
