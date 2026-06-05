import Link from "next/link";
import { ExternalLink, Loader2, Play, Square, Trash2, Video, Wifi, WifiOff } from "lucide-react";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import type { BusyCameraAction } from "@/features/cameras/hooks/useCameraDetection";
import { Camera, CameraDetectionStatus } from "@/features/cameras/types/camera";

interface CameraCardProps {
  camera: Camera;
  status?: CameraDetectionStatus;
  busy: boolean;
  busyAction: BusyCameraAction;
  previewing: boolean;
  onShowPreview: (cameraId: number) => void;
  onHidePreview: (cameraId: number) => void;
  onStartDetection: (cameraId: number) => void;
  onStopDetection: (cameraId: number) => void;
  onDeleteCamera: (cameraId: number, name: string) => void;
}

export default function CameraCard({ camera, status, busy, busyAction, previewing, onShowPreview, onHidePreview, onStartDetection, onStopDetection, onDeleteCamera }: CameraCardProps) {
  const running = Boolean(status?.running);
  const hasError = Boolean(status?.error);
  const hasFrame = Boolean(status?.hasFrame);
  const isStarting = busy && busyAction === "starting";
  const isStopping = busy && busyAction === "stopping";

  // 3 trạng thái rõ ràng:
  // 1. Chưa detect: !running && !hasError
  // 2. Lỗi RTSP: hasError
  // 3. Đang detect OK: running && hasFrame && !hasError
  // + Đang kết nối: busy && isNotStarted

  const isNotStarted = !running && !hasError;
  const isError = hasError;
  const isDetecting = running && hasFrame && !hasError;
  const isConnecting = isStarting && isNotStarted;
  const showStartButton = isNotStarted && !isStopping;

  return (
    <div style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem", minWidth: 0 }}>
      <Link href={`/cameras/${camera.id}`} aria-label={`Xem chi tiết ${camera.name}`} style={cardLinkOverlay} />
      <div style={{ background: "#020617", border: "1px solid var(--border)", borderRadius: "0.6rem", aspectRatio: "16/9", overflow: "hidden", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isDetecting && previewing ? (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <img src={camerasApi.getCameraStreamUrl(camera.id)} alt={`Live ${camera.name}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <button type="button" onClick={() => onHidePreview(camera.id)} style={{ position: "absolute", zIndex: 2, top: "0.5rem", right: "0.5rem", ...btnStyle, background: "rgba(15,23,42,0.85)", color: "#fff", padding: "0.35rem 0.75rem" }}>
              Ẩn preview
            </button>
          </div>
        ) : isDetecting && !previewing ? (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <button type="button" onClick={() => onShowPreview(camera.id)} style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: "0.45rem", ...btnStyle, background: "var(--surface-2)", color: "var(--text)" }}>
              <Video size={15} /> Mở stream
            </button>
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Đang detect, preview chưa được cấp</div>
          </div>
        ) : isConnecting ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "var(--text)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Đang kết nối camera...</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Vui lòng chờ</div>
          </div>
        ) : isError ? (
          <div style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ color: "var(--accent)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Lỗi kết nối camera</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{status?.error}</div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Camera chưa được kết nối</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{camera.name}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{camera.location}</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: isDetecting ? "var(--green)" : isError ? "var(--accent)" : "var(--text-muted)" }}>
          {isDetecting ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isDetecting ? "Detecting" : isError ? "Error" : "Stopped"}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 2, display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {showStartButton ? (
            <button id={`start-detect-${camera.id}`} disabled={busy} onClick={() => onStartDetection(camera.id)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", ...btnStyle, background: "var(--accent)", color: "#fff", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
              {isStarting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />} {isStarting ? "Đang bật..." : "Start Detect"}
            </button>
          ) : (
            <button id={`stop-detect-${camera.id}`} disabled={busy} onClick={() => onStopDetection(camera.id)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", ...btnStyle, background: "var(--surface-2)", color: "var(--text)", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
              {isStopping ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Square size={13} />} {isStopping ? "Đang dừng..." : "Stop"}
            </button>
          )}
          <Link href={`/cameras/${camera.id}`} style={detailLinkStyle}>
            <ExternalLink size={13} /> Chi tiết
          </Link>
        </div>

        <button id={`delete-cam-${camera.id}`} onClick={() => onDeleteCamera(camera.id, camera.name)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>
          <Trash2 size={13} /> Xóa
        </button>
      </div>
    </div>
  );
}

const cardLinkOverlay: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 1, borderRadius: "0.75rem" };
const btnStyle: React.CSSProperties = { border: "none", borderRadius: "0.5rem", padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 };
const detailLinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 };
