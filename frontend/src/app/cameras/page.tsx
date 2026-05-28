"use client";

import { FormEvent, useEffect, useState } from "react";
import { isAdmin } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { useCameras } from "@/hooks/useCameras";
import { api, CameraDetectionStatus } from "@/lib/api";
import { Camera as CameraIcon, Loader2, Play, Plus, RefreshCw, Square, Trash2, Wifi, WifiOff } from "lucide-react";

export default function CamerasPage() {
  const { cameras, loading, refreshing, error, setError, reload, addCamera, deleteCamera } = useCameras();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", rtspUrl: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<Record<number, CameraDetectionStatus>>({});
  const [busyCameraId, setBusyCameraId] = useState<number | null>(null);
  const [previewCameraIds, setPreviewCameraIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  async function loadStatuses() {
    const entries = await Promise.all(
      cameras.map(async cam => {
        try {
          return [cam.id, await api.getCameraDetectionStatus(cam.id)] as const;
        } catch {
          return [cam.id, { cameraId: cam.id, running: false, error: "AI Worker chưa sẵn sàng" }] as const;
        }
      })
    );
    setDetectionStatus(Object.fromEntries(entries));
  }

  useEffect(() => {
    if (cameras.length === 0) {
      setDetectionStatus({});
      return;
    }

    let cancelled = false;
    let loadingStatuses = false;
    async function loadCurrentStatuses() {
      if (loadingStatuses) return;
      loadingStatuses = true;
      try {
        const entries = await Promise.all(
          cameras.map(async cam => {
            try {
              return [cam.id, await api.getCameraDetectionStatus(cam.id)] as const;
            } catch {
              return [cam.id, { cameraId: cam.id, running: false, error: "AI Worker chưa sẵn sàng" }] as const;
            }
          })
        );
        if (!cancelled) setDetectionStatus(Object.fromEntries(entries));
      } finally {
        loadingStatuses = false;
      }
    }

    loadCurrentStatuses();
    const timer = window.setInterval(loadCurrentStatuses, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cameras]);

  async function handleRefresh() {
    await reload();
    await loadStatuses();
  }

  async function showPreview(cameraId: number) {
    try {
      const metrics = await api.getDashboardMetrics();
      const ramPct = metrics.system.ramTotalBytes > 0 ? (metrics.system.ramUsedBytes / metrics.system.ramTotalBytes) * 100 : 0;
      const gpuPct = metrics.system.gpu.available ? metrics.system.gpu.utilPct : 0;
      const loadPct = Math.max(metrics.system.cpuPct, ramPct, gpuPct);
      if (loadPct >= 80) {
        setError(`Hệ thống gần quá tải (${loadPct.toFixed(0)}%). Tạm thời không mở thêm preview.`);
        return;
      }
      setPreviewCameraIds(prev => new Set(prev).add(cameraId));
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể kiểm tra tải hệ thống");
    }
  }

  function hidePreview(cameraId: number) {
    setPreviewCameraIds(prev => {
      const next = new Set(prev);
      next.delete(cameraId);
      return next;
    });
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const success = await addCamera(form);
    if (success) {
      setForm({ name: "", rtspUrl: "", location: "" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function startDetection(cameraId: number) {
    const camera = cameras.find(cam => cam.id === cameraId);
    if (!camera) return;

    setBusyCameraId(cameraId);
    try {
      const status = await api.startCameraDetection(camera);
      setDetectionStatus(prev => ({ ...prev, [cameraId]: status }));
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể start AI Worker");
    } finally {
      setBusyCameraId(null);
    }
  }

  async function stopDetection(cameraId: number) {
    setBusyCameraId(cameraId);
    try {
      const status = await api.stopCameraDetection(cameraId);
      setDetectionStatus(prev => ({ ...prev, [cameraId]: status }));
      hidePreview(cameraId);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể stop AI Worker");
    } finally {
      setBusyCameraId(null);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CameraIcon size={22} /> Quản lý Camera
          </h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button id="cameras-refresh-btn" onClick={handleRefresh} style={refreshBtn}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Làm mới
            </button>
            {admin && (
              <button id="add-camera-btn" onClick={() => setShowForm(v => !v)} style={{
                background: "var(--accent)",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}>
                <Plus size={16} /> Thêm Camera
              </button>
            )}
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Tên camera</label>
              <input id="cam-name" style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Camera Kho A" />
            </div>
            <div>
              <label style={labelStyle}>Vị trí</label>
              <input id="cam-location" style={inputStyle} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required placeholder="Tầng 2 - Nhà xưởng" />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>RTSP URL</label>
              <input id="cam-rtsp" style={inputStyle} value={form.rtspUrl} onChange={e => setForm(f => ({ ...f, rtspUrl: e.target.value }))} required placeholder="rtsp://192.168.1.10:554/stream" />
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text-muted)" }}>Hủy</button>
              <button id="cam-save-btn" type="submit" disabled={saving} style={{ ...btnStyle, background: "var(--accent)", color: "#fff" }}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        )}

        {error && <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>{error}</div>}

        {/* Camera grid */}
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Đang tải...</p>
        ) : cameras.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Chưa có camera nào</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))", gap: "1.25rem" }}>
            {cameras.map(cam => {
              const status = detectionStatus[cam.id];
              const running = Boolean(status?.running);
              const hasWorker = Boolean(status && (status.running || status.error || status.hasFrame || status.lastAlertAt));
              const busy = busyCameraId === cam.id;
              const previewing = previewCameraIds.has(cam.id);

              return (
                <div key={cam.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem", minWidth: 0 }}>
                  <div style={{ background: "#020617", border: "1px solid var(--border)", borderRadius: "0.6rem", aspectRatio: "16/9", overflow: "hidden", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {running && previewing ? (
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <img src={api.getCameraStreamUrl(cam.id)} alt={`Live ${cam.name}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        <button type="button" onClick={() => hidePreview(cam.id)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", ...btnStyle, background: "rgba(15,23,42,0.85)", color: "#fff", padding: "0.35rem 0.75rem" }}>
                          Ẩn preview
                        </button>
                      </div>
                    ) : running ? (
                      <button type="button" onClick={() => showPreview(cam.id)} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text)" }}>
                        Xem preview
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Preview chưa chạy</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{cam.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{cam.location}</div>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: running ? "var(--green)" : hasWorker ? "var(--accent)" : "var(--text-muted)" }}>
                      {running ? <Wifi size={13} /> : <WifiOff size={13} />}
                      {running ? "Detecting" : hasWorker ? "Error" : "Stopped"}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", wordBreak: "break-all", marginBottom: "0.75rem" }}>
                    {cam.rtspUrl}
                  </div>

                  {status?.error && (
                    <div style={{ color: "var(--accent)", fontSize: "0.78rem", marginBottom: "0.75rem" }}>{status.error}</div>
                  )}

                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
                    {admin && (hasWorker ? (
                      <button id={`stop-detect-${cam.id}`} disabled={busy} onClick={() => stopDetection(cam.id)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", ...btnStyle, background: "var(--surface-2)", color: "var(--text)", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
                        {busy ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Square size={13} />} {busy ? "Đang dừng..." : "Stop"}
                      </button>
                    ) : (
                      <button id={`start-detect-${cam.id}`} disabled={busy} onClick={() => startDetection(cam.id)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", ...btnStyle, background: "var(--accent)", color: "#fff", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
                        {busy ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />} {busy ? "Đang bật..." : "Start Detect"}
                      </button>
                    ))}

                    {admin && (
                      <button id={`delete-cam-${cam.id}`} onClick={() => deleteCamera(cam.id, cam.name)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>
                        <Trash2 size={13} /> Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem" };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" };
const btnStyle: React.CSSProperties = { border: "none", borderRadius: "0.5rem", padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 };
const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
