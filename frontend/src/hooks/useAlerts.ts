import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Alert } from "@/lib/api";
import { getToken } from "@/lib/auth";

export function useAlerts(pageSize = 15) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string>();

  const load = useCallback(async (p: number) => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const data = await api.getAlerts(p, pageSize, token);
      setAlerts(data.content);
      setTotal(data.totalElements);
      setTotalPages(data.totalPages);
      setError(""); // clear error on success
    } catch {
      setError("Không thể tải danh sách cảnh báo");
    } finally {
      setLoading(false);
    }
  }, [token, pageSize]);

  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);
    if (!currentToken) {
      router.push("/login");
    }
  }, [router]);

  // Initial load when page changes
  useEffect(() => {
    load(page);
  }, [page, load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      setRefreshing(true);
      load(page).finally(() => setRefreshing(false));
    }, 30_000);
    return () => clearInterval(id);
  }, [page, load]);

  const deleteAlert = useCallback(async (id: number) => {
    if (!token) {
      return;
    }
    try {
      await api.deleteAlert(id, token);
      await load(page);
    } catch {
      setError("Không thể xoá cảnh báo");
    }
  }, [token, page, load]);

  const deleteAllAlerts = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      await api.deleteAllAlerts(token);
      setPage(0);
      await load(0);
    } catch {
      setError("Không thể xoá tất cả cảnh báo");
    }
  }, [token, load]);

  return {
    alerts,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refreshing,
    reload: () => load(page),
    deleteAlert,
    deleteAllAlerts,
  };
}
