"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { monitoringApi } from "@/features/monitoring/api/monitoringApi";
import { normalizeDashboardMetrics, toMonitoringError } from "@/features/monitoring/dtos/monitoringDto";
import { INITIAL_MONITORING_STATE, MONITORING_REFRESH_MS } from "@/features/monitoring/states/monitoringState";
import { getToken } from "@/shared/utils/auth";

export function useMonitoring() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(INITIAL_MONITORING_STATE.metrics);
  const [loading, setLoading] = useState(INITIAL_MONITORING_STATE.loading);
  const [refreshing, setRefreshing] = useState(INITIAL_MONITORING_STATE.refreshing);
  const [error, setError] = useState(INITIAL_MONITORING_STATE.error);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setMetrics(normalizeDashboardMetrics(await monitoringApi.getDashboardMetrics()));
    } catch {
      setError(toMonitoringError());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, MONITORING_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { metrics, loading, refreshing, error, reload: load };
}
