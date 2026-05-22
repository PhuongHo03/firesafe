import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Camera } from "@/lib/api";
import { getToken } from "@/lib/auth";

export function useCameras() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string>();

  const loadCameras = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getCameras(token);
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

  const addCamera = async (form: Omit<Camera, "id" | "active">) => {
    if (!token) return false;
    try {
      await api.createCamera({ ...form, active: true }, token);
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
      await api.deleteCamera(id, token);
      await loadCameras();
    } catch {
      setError("Không thể xóa camera");
    }
  };

  return {
    cameras,
    loading,
    error,
    setError,
    addCamera,
    deleteCamera,
  };
}
