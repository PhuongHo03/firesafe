"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/layouts/Sidebar";
import { alertsApi } from "@/features/alerts/api/alertsApi";
import type { Alert } from "@/features/alerts/types/alert";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import type { Camera } from "@/features/cameras/types/camera";
import { getToken } from "@/shared/utils/auth";
import { ArrowLeft, Bell, Camera as CameraIcon, ExternalLink, MapPin, Radio } from "lucide-react";

const CAMERA_DETAIL_ALERT_LIMIT = 50;

export default function CameraDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const cameraId = Number(params.id);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streamAllowed, setStreamAllowed] = useState(false);
  const keepaliveSecondsRef = useRef(30);

  const streamUrl = useMemo(() => camerasApi.getCameraStreamUrl(cameraId), [cameraId]);

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.push("/login");
      return;
    }
    const token: string = currentToken;
    if (!Number.isFinite(cameraId)) {
      setError("Camera không hợp lệ");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [cameraData, statusData, reservationsData, alertsData] = await Promise.all([
          camerasApi.getCamera(cameraId, token),
          camerasApi.getCameraDetectionStatus(cameraId, token),
          camerasApi.getMyPreviewReservations(token),
          alertsApi.getAlerts(0, CAMERA_DETAIL_ALERT_LIMIT, token, cameraId),
        ]);

        if (cancelled) return;
        const reservation = reservationsData.reservations.find(item => item.cameraId === cameraId);
        const canStream = Boolean(reservation?.reserved && statusData.running && statusData.hasFrame && !statusData.error);
        keepaliveSecondsRef.current = reservation?.keepaliveSec || 30;

        setCamera(cameraData);
        setAlerts(alertsData.content);
        setTotalAlerts(alertsData.totalElements);
        setStreamAllowed(canStream);
        setError(canStream ? "" : "Stream chưa được cấp hoặc camera không còn luồng preview hợp lệ");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải chi tiết camera");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cameraId, router]);

  useEffect(() => {
    if (!streamAllowed) return;
    const timer = window.setInterval(async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await camerasApi.keepAliveCameraPreview(cameraId, token);
        if (!res.reserved) {
          setStreamAllowed(false);
          setError(res.reason ?? "Stream preview đã hết hạn");
        }
      } catch (err: unknown) {
        setStreamAllowed(false);
        setError(err instanceof Error ? err.message : "Không thể duy trì stream preview");
      }
    }, keepaliveSecondsRef.current * 1000);
    return () => window.clearInterval(timer);
  }, [cameraId, streamAllowed]);

  function goToAlert(alertId: string) {
    if (alertId) {
      router.push(`/alerts/${alertId}`);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "1.5rem clamp(1rem, 2.5vw, 2rem)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <button onClick={() => router.back()} style={backBtn}>
            <ArrowLeft size={16} /> Quay lại
          </button>

          <div style={streamHeader}>
            <div style={headerMetric}>
              <div style={headerMetricLabel}>
                <CameraIcon size={16} color="var(--accent)" /> Hãng camera
              </div>
              <div style={headerMetricValue}>{camera?.name ?? "Chi tiết camera"}</div>
            </div>
            <div style={headerMetric}>
              <div style={headerMetricLabel}>
                <MapPin size={16} color="var(--yellow)" /> Location
              </div>
              <div style={headerMetricValue}>{camera?.location || "Không xác định"}</div>
            </div>
            <div style={headerMetric}>
              <div style={headerMetricLabel}>
                <Radio size={16} color={streamAllowed ? "var(--green)" : "var(--text-muted)"} /> Stream
              </div>
              <div style={{ ...headerMetricValue, color: streamAllowed ? "var(--green)" : "var(--text-muted)" }}>
                {streamAllowed ? "Live stream" : "No stream"}
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Đang tải...</p>
          ) : (
            <>
              <section style={streamShell}>
                {streamAllowed ? (
                  <img src={streamUrl} alt={`Live ${camera?.name ?? cameraId}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                ) : (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ color: "var(--text)", fontWeight: 700, marginBottom: "0.45rem" }}>Stream chưa sẵn sàng</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{error}</div>
                  </div>
                )}
              </section>

              <section style={{ marginTop: "1rem" }}>
                <div style={alertsPanel}>
                  <div style={alertsHeader}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 750, fontSize: "1.05rem" }}>
                        <Bell size={18} color="var(--accent)" /> Alerts
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
                        Alert gần nhất của camera này
                      </div>
                    </div>
                    <span style={totalAlertsPill}>Total alerts: {totalAlerts}</span>
                  </div>

                  <div style={alertsControlRow}>
                    <select
                      disabled={alerts.length === 0}
                      defaultValue=""
                      onChange={event => goToAlert(event.target.value)}
                      style={alertSelect}
                    >
                      <option value="">{alerts.length === 0 ? "Chưa có alert" : "Chọn alert để xem chi tiết"}</option>
                      {alerts.map(alert => (
                        <option key={alert.id} value={alert.id}>
                          #{alert.id} - {alert.label.toUpperCase()} - {Math.round(Number(alert.confidence) * 100)}% - {formatDate(alert.detectedAt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={alertListBox}>
                    {alerts.length === 0 ? (
                      <div style={emptyAlerts}>Camera này chưa có alert nào</div>
                    ) : alerts.map(alert => (
                      <button key={alert.id} onClick={() => router.push(`/alerts/${alert.id}`)} style={alertRow}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                          <span style={alertIdBadge}>#{alert.id}</span>
                          <span style={{ fontWeight: 750 }}>{alert.label.toUpperCase()}</span>
                          <span style={{ color: "var(--text-muted)" }}>{Math.round(Number(alert.confidence) * 100)}%</span>
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {formatDate(alert.detectedAt)} <ExternalLink size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  marginBottom: "1rem",
  fontSize: "0.875rem",
  padding: 0,
};

const streamShell: React.CSSProperties = {
  background: "#020617",
  border: "1px solid var(--border)",
  borderRadius: "0.7rem",
  aspectRatio: "16 / 9",
  minHeight: "360px",
  maxHeight: "calc(100vh - 220px)",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const streamHeader: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1rem",
  marginBottom: "1rem",
};

const headerMetric: React.CSSProperties = {
  minWidth: 0,
  minHeight: "76px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.7rem",
  padding: "0.85rem 1rem",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const headerMetricLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
  color: "var(--text-muted)",
  fontSize: "0.8rem",
  fontWeight: 700,
  marginBottom: "0.35rem",
};

const headerMetricValue: React.CSSProperties = {
  color: "var(--text)",
  fontSize: "1.15rem",
  fontWeight: 750,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const alertsPanel: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.7rem",
  padding: "1rem",
  minWidth: 0,
};

const alertsHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  marginBottom: "0.9rem",
  flexWrap: "wrap",
};

const totalAlertsPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "32px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "999px",
  color: "var(--text)",
  padding: "0.35rem 0.75rem",
  fontSize: "0.86rem",
  fontWeight: 700,
};

const alertSelect: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--text)",
  padding: "0.7rem 0.75rem",
  fontSize: "0.86rem",
  outline: "none",
};

const alertsControlRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "0.75rem",
};

const alertListBox: React.CSSProperties = {
  maxHeight: "260px",
  marginTop: "0.75rem",
  overflowY: "auto",
  border: "1px solid var(--border)",
  borderRadius: "0.55rem",
  background: "#10131d",
};

const emptyAlerts: React.CSSProperties = {
  minHeight: "88px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-muted)",
  fontSize: "0.9rem",
};

const alertIdBadge: React.CSSProperties = {
  flex: "0 0 auto",
  minWidth: "3rem",
  color: "var(--text)",
  fontWeight: 750,
};

const alertRow: React.CSSProperties = {
  width: "100%",
  minHeight: "50px",
  border: "none",
  borderBottom: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  padding: "0.7rem 0.85rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  fontSize: "0.88rem",
  textAlign: "left",
};
