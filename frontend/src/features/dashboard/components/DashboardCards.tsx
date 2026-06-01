import { AlertTriangle, BarChart3, Camera, Cpu, Database, Gauge, HardDrive, ListChecks, Server, Wifi } from "lucide-react";
import { formatBytes, formatBytesPair, getStatusColor, percent } from "@/features/dashboard/dtos/dashboardViewDto";
import { GRID4_STYLE } from "@/features/dashboard/states/dashboardState";
import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

export function DashboardCards({ metrics, alertTotal }: { metrics: DashboardMetrics | null; alertTotal: number }) {
  return (
    <>
      <div style={GRID4_STYLE}>
        <SummaryCard icon={<Database size={18} />} label="MariaDB" value={metrics?.infra.mariadb.status ?? "..."} color={getStatusColor(metrics?.infra.mariadb.status)} detail={`${metrics?.infra.mariadb.tableCount ?? 0} tables · ${metrics?.infra.mariadb.rowCount ?? 0} rows · ${formatBytes(metrics?.infra.mariadb.bytes ?? 0)}`} />
        <SummaryCard icon={<HardDrive size={18} />} label="MinIO" value={metrics?.infra.minio.status ?? "..."} color={getStatusColor(metrics?.infra.minio.status)} detail={`${metrics?.infra.minio.objectCount ?? 0} objects · ${formatBytes(metrics?.infra.minio.bytes ?? 0)}`} />
        <SummaryCard icon={<Database size={18} />} label="Redis" value={metrics?.infra.redis.status ?? "..."} color={getStatusColor(metrics?.infra.redis.status)} detail={`${metrics?.infra.redis.keyCount ?? 0} keys · ${formatBytes(metrics?.infra.redis.usedMemoryBytes ?? 0)}`} />
        <SummaryCard icon={<Server size={18} />} label="RabbitMQ" value={metrics?.infra.rabbitmq.status ?? "..."} color={getStatusColor(metrics?.infra.rabbitmq.status)} detail={`${metrics?.infra.rabbitmq.messages ?? 0} msg · ${metrics?.infra.rabbitmq.consumers ?? 0} consumers`} />
      </div>
      <div style={GRID4_STYLE}>
        <SummaryCard icon={<Server size={18} />} label="Backend" value={metrics?.backend.status ?? "..."} color={getStatusColor(metrics?.backend.status)} />
        <SummaryCard icon={<Cpu size={18} />} label="AI Worker" value={metrics?.aiWorker.status ?? "..."} color={getStatusColor(metrics?.aiWorker.status)} />
        <SummaryCard icon={<Camera size={18} />} label="Camera active" value={`${metrics?.cameras.active ?? 0}/${metrics?.cameras.total ?? 0}`} />
        <SummaryCard icon={<ListChecks size={18} />} label="Tổng cảnh báo" value={(metrics?.alerts.total ?? alertTotal).toString()} />
      </div>
      <div style={GRID4_STYLE}>
        <MetricCard icon={<Gauge size={18} />} label="CPU" value={`${(metrics?.system.cpuPct ?? 0).toFixed(0)}%`} percent={metrics?.system.cpuPct ?? 0} />
        <MetricCard icon={<Database size={18} />} label="RAM" value={formatBytesPair(metrics?.system.ramUsedBytes ?? 0, metrics?.system.ramTotalBytes ?? 0)} percent={percent(metrics?.system.ramUsedBytes ?? 0, metrics?.system.ramTotalBytes ?? 0)} />
        <MetricCard icon={<HardDrive size={18} />} label="Disk" value={formatBytesPair(metrics?.system.diskUsedBytes ?? 0, metrics?.system.diskTotalBytes ?? 0)} percent={percent(metrics?.system.diskUsedBytes ?? 0, metrics?.system.diskTotalBytes ?? 0)} />
        <MetricCard icon={<Cpu size={18} />} label="GPU" value={metrics?.system.gpu.available ? `${metrics.system.gpu.utilPct}%` : "N/A"} percent={metrics?.system.gpu.available ? metrics.system.gpu.utilPct : 0} detail={metrics?.system.gpu.available ? formatBytesPair(metrics.system.gpu.memoryUsedBytes, metrics.system.gpu.memoryTotalBytes) : undefined} />
      </div>
      <div style={GRID4_STYLE}>
        <SummaryCard icon={<Wifi size={18} />} label="API avg latency" value={`${(metrics?.backend.avgLatencyMs ?? 0).toFixed(0)}ms`} />
        <SummaryCard icon={<AlertTriangle size={18} />} label="API error rate" value={`${((metrics?.backend.errorRate ?? 0) * 100).toFixed(1)}%`} color={(metrics?.backend.errorRate ?? 0) > 0 ? "var(--accent)" : "var(--green)"} />
        <SummaryCard icon={<BarChart3 size={18} />} label="Requests" value={(metrics?.backend.requestsTotal ?? 0).toFixed(0)} />
        <SummaryCard icon={<AlertTriangle size={18} />} label="Alert mới" value={(metrics?.alerts.newCount ?? 0).toString()} color="var(--accent)" detail={`${metrics?.alerts.last24h ?? 0} trong 24h`} />
      </div>
    </>
  );
}

function SummaryCard({ icon, label, value, color, detail }: { icon: React.ReactNode; label: string; value: string; color?: string; detail?: string }) {
  return <div style={cardStyle}><div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: color ?? "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{icon} {label}</div><div style={{ fontSize: "1.5rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>{detail && <div style={{ marginTop: "0.35rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>{detail}</div>}</div>;
}

function MetricCard({ icon, label, value, percent, detail }: { icon: React.ReactNode; label: string; value: string; percent: number; detail?: string }) {
  const safe = Math.max(0, Math.min(100, percent));
  return <div style={cardStyle}><div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{icon} {label}</div><div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>{detail && <div style={{ marginTop: "0.35rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>{detail}</div>}<div style={{ height: 8, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden", marginTop: "0.75rem" }}><div style={{ width: `${safe}%`, height: "100%", background: safe > 85 ? "var(--accent)" : safe > 65 ? "var(--yellow)" : "var(--green)" }} /></div></div>;
}

const cardStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem" };
