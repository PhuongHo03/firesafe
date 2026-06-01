/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import { Camera, CameraFormState } from "@/features/cameras/types/camera";
import { getToken } from "@/shared/utils/auth";
import { buildCreateCameraRequest } from "@/features/cameras/dtos/cameraDto";
import { CAMERA_MIN_REFRESH_MS, wait } from "@/features/cameras/states/cameraState";

export function useCameras() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string>();

  const loadCameras = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await camerasApi.getCameras(token);
      setCameras(data);
      setError("");
    } catch {
      setError("Không thể tải danh sách camera");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);
    if (!currentToken) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (token) {
      loadCameras();
    }
  }, [token, loadCameras]);

  const addCamera = async (form: CameraFormState) => {
    if (!token) return false;
    try {
      await camerasApi.createCamera(buildCreateCameraRequest(form), token);
      await loadCameras();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi thêm camera");
      return false;
    }
  };

  const deleteCamera = async (id: number, name: string) => {
    if (!token || !confirm(`Xóa camera "${name}"?`)) return;
    try {
      await camerasApi.deleteCamera(id, token);
      await loadCameras();
    } catch {
      setError("Không thể xóa camera");
    }
  };

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCameras(), wait(CAMERA_MIN_REFRESH_MS)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadCameras]);

  return {
    cameras,
    loading,
    refreshing,
    error,
    setError,
    reload,
    addCamera,
    deleteCamera,
  };
}
