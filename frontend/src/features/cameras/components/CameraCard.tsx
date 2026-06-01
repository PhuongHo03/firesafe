import { Loader2, Play, Square, Trash2, Wifi, WifiOff } from "lucide-react";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import { hasWorkerStatus } from "@/features/cameras/dtos/cameraDto";
import { Camera, CameraDetectionStatus } from "@/features/cameras/types/camera";

interface CameraCardProps {
  camera: Camera;
  admin: boolean;
  status?: CameraDetectionStatus;
  busy: boolean;
  previewing: boolean;
  onShowPreview: (cameraId: number) => void;
  onHidePreview: (cameraId: number) => void;
  onStartDetection: (cameraId: number) => void;
  onStopDetection: (cameraId: number) => void;
  onDeleteCamera: (cameraId: number, name: string) => void;
}

export default function CameraCard({ camera, admin, status, busy, previewing, onShowPreview, onHidePreview, onStartDetection, onStopDetection, onDeleteCamera }: CameraCardProps) {
  const running = Boolean(status?.running);
  const hasWorker = hasWorkerStatus(status);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem", minWidth: 0 }}>
      <div style={{ background: "#020617", border: "1px solid var(--border)", borderRadius: "0.6rem", aspectRatio: "16/9", overflow: "hidden", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {running && previewing ? (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <img src={camerasApi.getCameraStreamUrl(camera.id)} alt={`Live ${camera.name}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <button type="button" onClick={() => onHidePreview(camera.id)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", ...btnStyle, background: "rgba(15,23,42,0.85)", color: "#fff", padding: "0.35rem 0.75rem" }}>
              Ẩn preview
            </button>
          </div>
        ) : running ? (
          <button type="button" onClick={() => onShowPreview(camera.id)} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text)" }}>
            Xem preview
          </button>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Preview chưa chạy</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{camera.name}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{camera.location}</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: running ? "var(--green)" : hasWorker ? "var(--accent)" : "var(--text-muted)" }}>
          {running ? <Wifi size={13} /> : <WifiOff size={13} />}
          {running ? "Detecting" : hasWorker ? "Error" : "Stopped"}
        </span>
      </div>

      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", wordBreak: "break-all", marginBottom: "0.75rem" }}>
        {camera.rtspUrl}
      </div>

      {status?.error && (
        <div style={{ color: "var(--accent)", fontSize: "0.78rem", marginBottom: "0.75rem" }}>{status.error}</div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
        {admin && (hasWorker ? (
          <button id={`stop-detect-${camera.id}`} disabled={busy} onClick={() => onStopDetection(camera.id)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", ...btnStyle, background: "var(--surface-2)", color: "var(--text)", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Square size={13} />} {busy ? "Đang dừng..." : "Stop"}
          </button>
        ) : (
          <button id={`start-detect-${camera.id}`} disabled={busy} onClick={() => onStartDetection(camera.id)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", ...btnStyle, background: "var(--accent)", color: "#fff", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />} {busy ? "Đang bật..." : "Start Detect"}
          </button>
        ))}

        {admin && (
          <button id={`delete-cam-${camera.id}`} onClick={() => onDeleteCamera(camera.id, camera.name)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>
            <Trash2 size={13} /> Xóa
          </button>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { border: "none", borderRadius: "0.5rem", padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 };
