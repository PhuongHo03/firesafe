import { CameraFormState } from "@/features/cameras/types/camera";

interface CameraFormProps {
  form: CameraFormState;
  saving: boolean;
  onFieldChange: (field: keyof CameraFormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function CameraForm({ form, saving, onFieldChange, onSubmit, onCancel }: CameraFormProps) {
  return (
    <form onSubmit={onSubmit} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <div>
        <label style={labelStyle}>Tên camera</label>
        <input id="cam-name" style={inputStyle} value={form.name} onChange={e => onFieldChange("name", e.target.value)} required placeholder="Camera Kho A" />
      </div>
      <div>
        <label style={labelStyle}>Vị trí</label>
        <input id="cam-location" style={inputStyle} value={form.location} onChange={e => onFieldChange("location", e.target.value)} required placeholder="Tầng 2 - Nhà xưởng" />
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <label style={labelStyle}>RTSP URL</label>
        <input id="cam-rtsp" style={inputStyle} value={form.rtspUrl} onChange={e => onFieldChange("rtspUrl", e.target.value)} required placeholder="rtsp://192.168.1.10:554/stream" />
      </div>
      <div style={{ gridColumn: "1/-1", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text-muted)" }}>Hủy</button>
        <button id="cam-save-btn" type="submit" disabled={saving} style={{ ...btnStyle, background: "var(--accent)", color: "#fff" }}>
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem" };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" };
const btnStyle: React.CSSProperties = { border: "none", borderRadius: "0.5rem", padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 };
