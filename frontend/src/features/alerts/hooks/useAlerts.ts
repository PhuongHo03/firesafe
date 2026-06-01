/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { alertsApi } from "@/features/alerts/api/alertsApi";
import { Alert } from "@/features/alerts/types/alert";
import { getToken } from "@/shared/utils/auth";

import { ALERTS_AUTO_REFRESH_MS, ALERTS_MIN_REFRESH_MS, wait } from "@/features/alerts/states/alertsState";

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

  const load = useCallback(async (p: number, showLoading = true) => {
    if (!token) {
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const data = await alertsApi.getAlerts(p, pageSize, token);
      setAlerts(data.content);
      setTotal(data.totalElements);
      setTotalPages(data.totalPages);
      setError("");
    } catch {
      setError("Không thể tải danh sách cảnh báo");
    } finally {
      if (showLoading) setLoading(false);
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
      load(page, false).finally(() => setRefreshing(false));
    }, ALERTS_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [page, load]);

  const deleteAlert = useCallback(async (id: number) => {
    if (!token) {
      return;
    }
    try {
      await alertsApi.deleteAlert(id, token);
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
      await alertsApi.deleteAllAlerts(token);
      setPage(0);
      await load(0);
    } catch {
      setError("Không thể xoá tất cả cảnh báo");
    }
  }, [token, load]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(page, false), wait(ALERTS_MIN_REFRESH_MS)]);
    } finally {
      setRefreshing(false);
    }
  }, [page, load]);

  return {
    alerts,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refreshing,
    reload,
    deleteAlert,
    deleteAllAlerts,
  };
}
