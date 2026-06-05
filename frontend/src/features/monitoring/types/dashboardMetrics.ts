export interface DashboardMetrics {
  generatedAt: string;
  backend: {
    status: string;
    requestsTotal: number;
    errorRate: number;
    avgLatencyMs: number;
    uptimeSeconds: number;
    error?: string;
  };
  aiWorker: {
    status: string;
    workers: number;
    sources: number;
    cameras: Array<{
      cameraId: number;
      running?: boolean;
      hasFrame?: boolean;
      hasError?: boolean;
      detectionsTotal?: number;
      alertsSentTotal?: number;
      inferenceMsAvg?: number;
    }>;
    error?: string;
  };
  system: {
    cpuPct: number;
    ramUsedBytes: number;
    ramTotalBytes: number;
    diskUsedBytes: number;
    diskTotalBytes: number;
    gpu: { available: false } | { available: true; utilPct: number; memoryUsedBytes: number; memoryTotalBytes: number };
  };
  infra: {
    mariadb: { status: string; tableCount: number; rowCount: number; bytes: number; error?: string };
    minio: { status: string; objectCount: number; bytes: number; error?: string };
    redis: { status: string; usedMemoryBytes: number; keyCount: number; error?: string };
    rabbitmq: { status: string; messages: number; consumers: number; error?: string };
  };
  alerts: {
    total: number;
    newCount: number;
    last24h: number;
    highConfidenceLast24h: number;
    byLabel: Array<{ label: string; count: number }>;
    hourly: Array<{ hour: string; count: number }>;
  };
  cameras: {
    total: number;
    active: number;
  };
}
