import { requestAI } from "@/shared/utils/http";
import { WorkerMonitoringSummary } from "@/features/logs/types/workerMonitoringSummary";

export const logsApi = {
  getWorkerMonitoringSummary() {
    return requestAI<WorkerMonitoringSummary>("/api/monitoring/summary");
  },
};
