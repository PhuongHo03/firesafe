"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/layouts/Sidebar";
import { useWorkerLogs } from "@/features/logs/hooks/useWorkerLogs";
import { WorkerMonitoringSummary } from "@/features/logs/types/workerMonitoringSummary";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import { getToken } from "@/shared/utils/auth";
import { Activity, RefreshCw, ScrollText } from "lucide-react";

function fmtNumber(value: number | undefined, digits = 2) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function fmtBool(value: boolean | undefined) {
  if (value === undefined) return "-";
  return value ? "Yes" : "No";
}

function fmtTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

export default function LogsScreen() {
  const { summary, loading, refreshing, error, lastUpdatedAt, refresh } = useWorkerLogs();
  const [cameraMap, setCameraMap] = useState<Record<number, string>>({});

  useEffect(() => {
    let mounted = true;
    const loadCameras = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const cams = await camerasApi.getCameras(token);
        if (!mounted) return;
        const m: Record<number, string> = {};
        cams.forEach(c => {
          m[c.id] = c.location || c.name || `Camera ${String(c.id).padStart(3, '0')}`;
        });
        setCameraMap(m);
      } catch {
        // ignore: fallback to id
      }
    };
    void loadCameras();
    const timer = window.setInterval(() => {
      void loadCameras();
    }, 60000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ScrollText size={22} /> Runtime Logs
            </h1>
            <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              AI Worker monitoring summary — chỉ giữ snapshot mới nhất, không lưu database.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Cập nhật: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString("vi-VN") : "-"}
            </span>
            <button onClick={refresh} style={refreshBtn}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Làm mới
            </button>
          </div>
        </div>

        {error && <div style={errorBox}>{error}</div>}
        {loading && !summary ? <div style={emptyBox}>Đang tải runtime logs...</div> : summary && <LogsContent summary={summary} cameraMap={cameraMap} />}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  );
}

function LogsContent({ summary, cameraMap }: { summary: WorkerMonitoringSummary; cameraMap: Record<number, string> }) {
  const scheduler = summary.inferenceScheduler;
  const explanationRows = [
    ["Worker Status", summary.status, "AI Worker HTTP service health"],
    ["Detecting Cameras", summary.workers, "Số camera worker đang detect"],
    ["Shared Sources", summary.sources, "Số RTSP source đang giữ trong memory; camera trùng RTSP có thể share source"],
    ["Scheduler", fmtBool(scheduler.running), "Scheduler thread đang chạy hay không"],
    ["Registered Cameras", scheduler.registeredCameras, "Số cameras đã đăng ký vào scheduler để được infer"],
    ["Batch Max Size", scheduler.batchMaxSize, "Giới hạn trên số frame/batch; thực tế scheduler chạy partial batch nếu camera ít hơn"],
    ["Batch Max Wait", `${scheduler.batchMaxWaitMs} ms`, "Thời gian chờ ngắn để gom thêm frame trước khi infer partial batch"],
    ["Batches Total", scheduler.batchesTotal, "Tổng số lần scheduler gọi YOLO batch inference từ lúc worker start"],
    ["Frames Inferred", scheduler.framesInferredTotal, "Tổng số frames đã được infer từ lúc worker start"],
    ["Avg Batch Size", fmtNumber(scheduler.avgBatchSize), "Trung bình số frame thực tế trong mỗi batch; < max nếu camera ít hoặc chưa có frame"],
    ["Avg Inference", `${fmtNumber(scheduler.avgInferenceMs)} ms`, "Trung bình thời gian inference mỗi batch"],
    ["Errors Total", scheduler.errorsTotal, "Tổng lỗi scheduler/inference"],
    ["Has Frame", "-", "Camera đã đọc được frame RTSP mới nhất"],
    ["Detections", "-", "Tổng detections của camera từ lúc detect start"],
    ["Alerts", "-", "Tổng alerts đã tạo sau sustained/cooldown gates"],
    ["Avg Inference", "-", "Trung bình inference cho camera đó"],
    ["Last Alert", "-", "Thời điểm alert gần nhất của camera"],
    ["Error", "-", "Lỗi camera/RTSP/inference gần nhất nếu có"],
  ];

  return (
    <>
      <section style={cardGrid}>
        <StatusCard label="Worker Status" value={summary.status} tone={summary.status === "UP" ? "green" : "red"} />
        <StatusCard label="Detecting Cameras" value={summary.workers} />
        <StatusCard label="Shared Sources" value={summary.sources} />
        <StatusCard label="Scheduler" value={scheduler.running ? "Running" : "Stopped"} tone={scheduler.running ? "green" : "red"} />
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}><Activity size={18} /> Inference Scheduler</h2>
        <div style={metricGrid}>
          <Metric label="Registered Cameras" value={scheduler.registeredCameras} />
          <Metric label="Batch Max Size" value={scheduler.batchMaxSize} />
          <Metric label="Batch Max Wait" value={`${scheduler.batchMaxWaitMs} ms`} />
          <Metric label="Batches Total" value={scheduler.batchesTotal} />
          <Metric label="Frames Inferred" value={scheduler.framesInferredTotal} />
          <Metric label="Avg Batch Size" value={fmtNumber(scheduler.avgBatchSize)} />
          <Metric label="Avg Inference" value={`${fmtNumber(scheduler.avgInferenceMs)} ms`} />
          <Metric label="Errors Total" value={scheduler.errorsTotal} tone={scheduler.errorsTotal ? "red" : "green"} />
        </div>
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Camera Runtime</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Camera</Th>
                <Th>Running</Th>
                <Th>Has Frame</Th>
                <Th>Detections</Th>
                <Th>Alerts</Th>
                <Th>Avg Inference</Th>
                <Th>Last Alert</Th>
                <Th>Error</Th>
              </tr>
            </thead>
            <tbody>
              {summary.cameras.length === 0 ? (
                <tr><Td colSpan={8}>Chưa có camera nào đang detect.</Td></tr>
              ) : summary.cameras.map(camera => (
                <tr key={camera.cameraId}>
                  <Td>{cameraMap[camera.cameraId] ?? `Camera ${String(camera.cameraId).padStart(3,'0')}`}</Td>
                  <Td><Badge ok={camera.running}>{fmtBool(camera.running)}</Badge></Td>
                  <Td><Badge ok={camera.hasFrame}>{fmtBool(camera.hasFrame)}</Badge></Td>
                  <Td>{camera.detectionsTotal ?? 0}</Td>
                  <Td>{camera.alertsTotal ?? 0}</Td>
                  <Td>{fmtNumber(camera.inferenceMsAvg)} ms</Td>
                  <Td>{fmtTime(camera.lastAlertAt)}</Td>
                  <Td>{camera.error ?? "-"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Value explanations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.5rem", fontSize: "0.85rem" }}>
          {explanationRows.map(([label, value, description]) => (
            <div key={label} style={explanationCompactRow}>
              <div style={explanationLabel}>{label}:</div>
              <div style={explanationValue}>{value}</div>
              <div style={explanationDesc}>{description}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "red" }) {
  return <div style={panel}><div style={labelStyle}>{label}</div><div style={{ ...valueStyle, color: tone === "green" ? "var(--green)" : tone === "red" ? "var(--accent)" : "var(--text)" }}>{value}</div></div>;
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "red" }) {
  return <div style={metricBox}><div style={labelStyle}>{label}</div><div style={{ fontWeight: 700, color: tone === "green" ? "var(--green)" : tone === "red" ? "var(--accent)" : "var(--text)" }}>{value}</div></div>;
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span style={{ ...badgeStyle, color: ok ? "var(--green)" : "var(--text-muted)", borderColor: ok ? "rgba(34,197,94,0.4)" : "var(--border)" }}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={tdStyle}>{children}</td>;
}

const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
const errorBox: React.CSSProperties = { background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" };
const emptyBox: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem", color: "var(--text-muted)" };
const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1rem" };
const cardGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1rem" };
const metricGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" };
const metricBox: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.6rem", padding: "0.75rem" };
const sectionTitle: React.CSSProperties = { margin: "0 0 1rem", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.45rem" };
const labelStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.35rem" };
const valueStyle: React.CSSProperties = { fontSize: "1.35rem", fontWeight: 700 };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.75rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "0.75rem", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "top" };
const badgeStyle: React.CSSProperties = { display: "inline-block", border: "1px solid", borderRadius: "999px", padding: "0.15rem 0.5rem", fontSize: "0.75rem" };
const explanationCompactRow: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.65rem 0.85rem" };
const explanationLabel: React.CSSProperties = { fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", fontSize: "0.8rem" };
const explanationValue: React.CSSProperties = { color: "var(--text)", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.35rem" };
const explanationDesc: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.4 };
