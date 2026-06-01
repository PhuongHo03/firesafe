"use client";

import Sidebar from "@/layouts/Sidebar";
import AiWorkerRuntimeTable from "@/features/dashboard/components/AiWorkerRuntimeTable";
import ChartCard from "@/features/dashboard/components/ChartCard";
import { DashboardCards } from "@/features/dashboard/components/DashboardCards";
import LatestAlertsTable from "@/features/dashboard/components/LatestAlertsTable";
import { hourlyChartData, labelChartData } from "@/features/dashboard/dtos/dashboardViewDto";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { Flame, RefreshCw } from "lucide-react";

export default function DashboardScreen() {
  const { alertsState, monitoring, metrics, error, refreshing, reloadAll } = useDashboard();

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
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Làm mới
          </button>
        </div>

        {error && (
          <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <DashboardCards metrics={metrics} alertTotal={alertsState.total} />

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <ChartCard title="Alerts theo giờ" subtitle="24 giờ gần nhất" data={hourlyChartData(metrics)} />
          <ChartCard title="Alerts theo loại" subtitle="fire / smoke" data={labelChartData(metrics)} />
        </div>

        <AiWorkerRuntimeTable metrics={metrics} loading={monitoring.loading} />
        <LatestAlertsTable alerts={alertsState.alerts} loading={alertsState.loading} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
