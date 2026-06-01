/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { monitoringApi } from "@/features/monitoring/api/monitoringApi";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import { buildWorkerUnavailableStatus, getSystemLoadPct } from "@/features/cameras/dtos/cameraDto";
import { CAMERA_PREVIEW_LOAD_LIMIT_PCT, CAMERA_STATUS_REFRESH_MS, hideCameraPreview, setCameraStatus, showCameraPreview } from "@/features/cameras/states/cameraState";
import { Camera, CameraDetectionStatus } from "@/features/cameras/types/camera";

export function useCameraDetection(cameras: Camera[], setError: (error: string) => void) {
  const [detectionStatus, setDetectionStatus] = useState<Record<number, CameraDetectionStatus>>({});
  const [busyCameraId, setBusyCameraId] = useState<number | null>(null);
  const [previewCameraIds, setPreviewCameraIds] = useState<Set<number>>(() => new Set());

  async function loadStatuses() {
    const entries = await Promise.all(
      cameras.map(async camera => {
        try {
          return [camera.id, await camerasApi.getCameraDetectionStatus(camera.id)] as const;
        } catch {
          return [camera.id, buildWorkerUnavailableStatus(camera.id)] as const;
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
          cameras.map(async camera => {
            try {
              return [camera.id, await camerasApi.getCameraDetectionStatus(camera.id)] as const;
            } catch {
              return [camera.id, buildWorkerUnavailableStatus(camera.id)] as const;
            }
          })
        );
        if (!cancelled) setDetectionStatus(Object.fromEntries(entries));
      } finally {
        loadingStatuses = false;
      }
    }

    loadCurrentStatuses();
    const timer = window.setInterval(loadCurrentStatuses, CAMERA_STATUS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cameras]);

  async function showPreview(cameraId: number) {
    try {
      const loadPct = getSystemLoadPct(await monitoringApi.getDashboardMetrics());
      if (loadPct >= CAMERA_PREVIEW_LOAD_LIMIT_PCT) {
        setError(`Hệ thống gần quá tải (${loadPct.toFixed(0)}%). Tạm thời không mở thêm preview.`);
        return;
      }
      setPreviewCameraIds(prev => showCameraPreview(prev, cameraId));
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể kiểm tra tải hệ thống");
    }
  }

  function hidePreview(cameraId: number) {
    setPreviewCameraIds(prev => hideCameraPreview(prev, cameraId));
  }

  async function startDetection(cameraId: number) {
    const camera = cameras.find(item => item.id === cameraId);
    if (!camera) return;

    setBusyCameraId(cameraId);
    try {
      const status = await camerasApi.startCameraDetection(camera);
      setDetectionStatus(prev => setCameraStatus(prev, cameraId, status));
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
      const status = await camerasApi.stopCameraDetection(cameraId);
      setDetectionStatus(prev => setCameraStatus(prev, cameraId, status));
      hidePreview(cameraId);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể stop AI Worker");
    } finally {
      setBusyCameraId(null);
    }
  }

  return { detectionStatus, busyCameraId, previewCameraIds, loadStatuses, showPreview, hidePreview, startDetection, stopDetection };
}
