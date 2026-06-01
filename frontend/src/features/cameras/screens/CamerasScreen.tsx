"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { isAdmin } from "@/shared/utils/auth";
import Sidebar from "@/layouts/Sidebar";
import CameraForm from "@/features/cameras/components/CameraForm";
import CameraGrid from "@/features/cameras/components/CameraGrid";
import { useCameraDetection } from "@/features/cameras/hooks/useCameraDetection";
import { useCameraForm } from "@/features/cameras/hooks/useCameraForm";
import { useCameras } from "@/features/cameras/hooks/useCameras";
import { Camera as CameraIcon, Plus, RefreshCw } from "lucide-react";

export default function CamerasScreen() {
  const { cameras, loading, refreshing, error, setError, reload, addCamera, deleteCamera } = useCameras();
  const { showForm, setShowForm, form, saving, updateField, handleAdd } = useCameraForm(addCamera);
  const { detectionStatus, busyCameraId, previewCameraIds, loadStatuses, showPreview, hidePreview, startDetection, stopDetection } = useCameraDetection(cameras, setError);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  async function handleRefresh() {
    await reload();
    await loadStatuses();
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
              <button id="add-camera-btn" onClick={() => setShowForm(v => !v)} style={addBtn}>
                <Plus size={16} /> Thêm Camera
              </button>
            )}
          </div>
        </div>

        {showForm && <CameraForm form={form} saving={saving} onFieldChange={updateField} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />}
        {error && <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "var(--accent)" }}>{error}</div>}

        <CameraGrid
          cameras={cameras}
          loading={loading}
          admin={admin}
          detectionStatus={detectionStatus}
          busyCameraId={busyCameraId}
          previewCameraIds={previewCameraIds}
          onShowPreview={showPreview}
          onHidePreview={hidePreview}
          onStartDetection={startDetection}
          onStopDetection={stopDetection}
          onDeleteCamera={deleteCamera}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  );
}

const refreshBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" };
const addBtn: React.CSSProperties = { background: "var(--accent)", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", fontWeight: 600 };
