"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { logsApi } from "@/features/logs/api/logsApi";
import { WorkerMonitoringSummary } from "@/features/logs/types/workerMonitoringSummary";
import { getToken } from "@/shared/utils/auth";

const REFRESH_INTERVAL_MS = 2000;

export function useWorkerLogs() {
  const [summary, setSummary] = useState<WorkerMonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadSummary = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Vui lòng đăng nhập để xem runtime logs");
      }
      const data = await logsApi.getWorkerMonitoringSummary(token);
      setSummary(data);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải runtime logs");
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    const timer = window.setInterval(() => {
      void loadSummary();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadSummary]);

  return {
    summary,
    loading,
    refreshing,
    error,
    lastUpdatedAt,
    refresh: () => loadSummary(true),
  };
}
