import CameraCard from "@/features/cameras/components/CameraCard";
import { Camera, CameraDetectionStatus } from "@/features/cameras/types/camera";

interface CameraGridProps {
  cameras: Camera[];
  loading: boolean;
  admin: boolean;
  detectionStatus: Record<number, CameraDetectionStatus>;
  busyCameraId: number | null;
  previewCameraIds: Set<number>;
  onShowPreview: (cameraId: number) => void;
  onHidePreview: (cameraId: number) => void;
  onStartDetection: (cameraId: number) => void;
  onStopDetection: (cameraId: number) => void;
  onDeleteCamera: (cameraId: number, name: string) => void;
}

export default function CameraGrid({ cameras, loading, admin, detectionStatus, busyCameraId, previewCameraIds, onShowPreview, onHidePreview, onStartDetection, onStopDetection, onDeleteCamera }: CameraGridProps) {
  if (loading) {
    return <p style={{ color: "var(--text-muted)" }}>Đang tải...</p>;
  }
  if (cameras.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>Chưa có camera nào</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))", gap: "1.25rem" }}>
      {cameras.map(camera => (
        <CameraCard
          key={camera.id}
          camera={camera}
          admin={admin}
          status={detectionStatus[camera.id]}
          busy={busyCameraId === camera.id}
          previewing={previewCameraIds.has(camera.id)}
          onShowPreview={onShowPreview}
          onHidePreview={onHidePreview}
          onStartDetection={onStartDetection}
          onStopDetection={onStopDetection}
          onDeleteCamera={onDeleteCamera}
        />
      ))}
    </div>
  );
}
