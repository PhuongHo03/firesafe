import { Camera, Clock, Flame, MapPin, Tag } from "lucide-react";
import { getAlertImageUrl } from "@/features/alerts/dtos/alertViewDto";
import { Alert } from "@/features/alerts/types/alert";
import { getAlertStatusBackground, getAlertStatusColor, getAlertStatusText } from "@/shared/utils/alertStatus";
import { formatVietnamDateTime } from "@/shared/utils/date";

export default function AlertDetailCard({ alert }: { alert: Alert }) {
  const imageUrl = getAlertImageUrl(alert);
  return (
    <div className="alert-detail-card">
      <div className="alert-image-panel">
        {imageUrl ? (
          <img src={imageUrl} alt="Hiện trường" className="alert-image" />
        ) : (
          <span className="empty-image">Không có ảnh</span>
        )}
      </div>

      <div className="alert-info-panel">
        <InfoRow icon={<Camera size={16} />} label="Camera" value={alert.cameraName} />
        <InfoRow icon={<MapPin size={16} />} label="Location" value={alert.cameraLocation || "Không xác định"} />
        <InfoRow icon={<Tag size={16} />} label="Loại cảnh báo" value={alert.label.toUpperCase()} color="var(--accent)" />
        <InfoRow icon={<Flame size={16} />} label="Độ tin cậy" value={`${(alert.confidence * 100).toFixed(1)}%`} color={alert.confidence >= 0.9 ? "var(--accent)" : "var(--yellow)"} />
        <InfoRow icon={<Clock size={16} />} label="Thời gian phát hiện" value={formatVietnamDateTime(alert.detectedAt)} />
        <div>
          <span className="info-label">TRẠNG THÁI</span>
          <div
            className="status-pill"
            style={{
              background: getAlertStatusBackground(alert.status),
              color: getAlertStatusColor(alert.status),
              borderColor: `${getAlertStatusColor(alert.status)}66`,
            }}
          >
            <span className="status-dot" style={{ background: getAlertStatusColor(alert.status) }} />
            {getAlertStatusText(alert.status)}
          </div>
        </div>
      </div>
      <style jsx>{`
        .alert-detail-card {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(340px, 0.55fr);
          gap: clamp(1rem, 1.8vw, 1.5rem);
          min-height: 0;
          height: 100%;
          width: 100%;
        }

        .alert-image-panel,
        .alert-info-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
        }

        .alert-image-panel {
          overflow: hidden;
          min-height: 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alert-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          background: #020617;
        }

        .empty-image {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .alert-info-panel {
          padding: clamp(1.35rem, 2vw, 2rem);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: clamp(1.35rem, 2.1vh, 2rem);
          min-width: 0;
        }

        .info-label {
          display: block;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 700;
          margin-bottom: 0.55rem;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid;
          border-radius: 0.5rem;
          padding: 0.55rem 0.9rem;
          font-size: 1rem;
          font-weight: 700;
        }

        .status-dot {
          width: 0.65rem;
          height: 0.65rem;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        @media (max-width: 1100px) {
          .alert-detail-card {
            grid-template-columns: 1fr;
            height: auto;
          }

          .alert-image-panel {
            height: min(68vh, 720px);
          }

          .alert-info-panel {
            justify-content: flex-start;
          }
        }

        @media (max-width: 760px) {
          .alert-image-panel {
            height: auto;
            aspect-ratio: 16 / 9;
          }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="info-label-row">
        {icon} {label}
      </div>
      <div className="info-value" style={{ color: color ?? "var(--text)" }}>{value}</div>
      <style jsx>{`
        .info-label-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-bottom: 0.45rem;
          font-weight: 700;
        }

        .info-value {
          font-size: clamp(1.15rem, 1.35vw, 1.45rem);
          font-weight: 750;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}
