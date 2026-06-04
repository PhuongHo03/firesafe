import { request } from "@/shared/utils/http";
import { WorkerMonitoringSummary } from "@/features/logs/types/workerMonitoringSummary";

export const logsApi = {
  getWorkerMonitoringSummary(token: string) {
    return request<WorkerMonitoringSummary>("/api/admin/worker/monitoring/summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
