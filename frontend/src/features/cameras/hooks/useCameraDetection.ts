/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import { buildWorkerUnavailableStatus } from "@/features/cameras/dtos/cameraDto";
import { CAMERA_STATUS_REFRESH_MS, hideCameraPreview, setCameraStatus, showCameraPreview } from "@/features/cameras/states/cameraState";
import { Camera, CameraDetectionStatus } from "@/features/cameras/types/camera";
import { getToken } from "@/shared/utils/auth";

export function useCameraDetection(cameras: Camera[], setError: (error: string) => void) {
  const [detectionStatus, setDetectionStatus] = useState<Record<number, CameraDetectionStatus>>({});
  const [busyCameraId, setBusyCameraId] = useState<number | null>(null);
  const [previewCameraIds, setPreviewCameraIds] = useState<Set<number>>(() => new Set());
  const keepaliveSecondsRef = useRef(30);

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
      const token = getToken();
      if (!token) {
        setError("Vui lòng đăng nhập để xem preview");
        return;
      }
      const res = await camerasApi.reserveCameraPreview(cameraId, token);
      if (res.reserved) {
        keepaliveSecondsRef.current = res.keepaliveSec || 30;
        setPreviewCameraIds(prev => showCameraPreview(prev, cameraId));
        setError("");
      } else {
        setError(res.reason ?? "Không thể mở preview");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể kiểm tra tải hệ thống");
    }
  }

  async function hidePreview(cameraId: number) {
    try {
      const token = getToken();
      if (token) await camerasApi.releaseCameraPreview(cameraId, token).catch(() => {});
    } catch {
      // cleanup even if API fails
    }
    setPreviewCameraIds(prev => hideCameraPreview(prev, cameraId));
  }

  // Resume preview reservations on mount
  useEffect(() => {
    let cancelled = false;
    async function resume() {
      try {
        const token = getToken();
        if (!token) return;
        const my = await camerasApi.getMyPreviewReservations(token);
        if (cancelled) return;
        const ids = my.reservations.map(r => r.cameraId);
        if (ids.length > 0) {
          setPreviewCameraIds(new Set(ids));
        }
      } catch {
        // preview not essential on first load
      }
    }
    void resume();
    return () => { cancelled = true; };
  }, []);

  // Keepalive interval for all open previews
  useEffect(() => {
    const aliveSec = keepaliveSecondsRef.current || 30;
    const timer = window.setInterval(async () => {
      const token = getToken();
      if (!token) return;
      const ids = [...previewCameraIds];
      for (const id of ids) {
        try {
          const res = await camerasApi.keepAliveCameraPreview(id, token);
          if (!res.reserved) {
            setPreviewCameraIds(prev => hideCameraPreview(prev, id));
          }
        } catch {
          setPreviewCameraIds(prev => hideCameraPreview(prev, id));
        }
      }
    }, aliveSec * 1000);
    return () => window.clearInterval(timer);
  }, [previewCameraIds]);

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
