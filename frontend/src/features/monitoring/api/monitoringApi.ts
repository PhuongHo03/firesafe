import { requestPrometheus } from "@/shared/utils/http";
import { DashboardMetrics } from "@/features/monitoring/types/dashboardMetrics";

type PrometheusResult = {
  metric: Record<string, string>;
  value?: [number, string];
};

type PrometheusResponse = {
  status: string;
  data?: {
    result?: PrometheusResult[];
  };
};

type CacheEntry = {
  expiresAt: number;
  promise: Promise<DashboardMetrics>;
};

const CACHE_TTL_MS = 3000;
let cache: CacheEntry | null = null;

function scalar(response: PrometheusResponse): number {
  const value = response.data?.result?.[0]?.value?.[1];
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusFromUp(value: number) {
  return value >= 1 ? "UP" : "DOWN";
}

async function queryValue(query: string): Promise<number> {
  try {
    return scalar(await requestPrometheus<PrometheusResponse>(query));
  } catch {
    return 0;
  }
}

async function queryVector(query: string): Promise<PrometheusResult[]> {
  try {
    const response = await requestPrometheus<PrometheusResponse>(query);
    return response.data?.result ?? [];
  } catch {
    return [];
  }
}

function metricNumber(result: PrometheusResult): number {
  const parsed = Number(result.value?.[1] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rate(errorCount: number, total: number) {
  return total > 0 ? errorCount / total : 0;
}

async function buildDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    backendUp,
    backendRequests,
    backendErrors,
    backendLatencyMs,
    backendUptime,
    aiWorkerUp,
    aiWorkers,
    aiSources,
    aiCameraRunning,
    aiCameraHasFrame,
    aiCameraError,
    aiDetections,
    aiAlerts,
    aiInferenceMs,
    redisUp,
    redisMemory,
    redisKeys,
    mariadbUp,
    minioUp,
    rabbitmqUp,
    rabbitmqMessages,
    rabbitmqConsumers,
    nodeUp,
    cpuIdle,
    ramTotal,
    ramAvailable,
    diskTotal,
    diskAvailable,
  ] = await Promise.all([
    queryValue('up{job="backend"}'),
    queryValue('sum(http_server_requests_seconds_count{job="backend"})'),
    queryValue('sum(http_server_requests_seconds_count{job="backend",status=~"5.."})'),
    queryValue('sum(http_server_requests_seconds_sum{job="backend"}) / sum(http_server_requests_seconds_count{job="backend"}) * 1000'),
    queryValue('process_uptime_seconds{job="backend"}'),
    queryValue('up{job="ai-worker"}'),
    queryValue('firesafe_ai_workers_total{job="ai-worker"}'),
    queryValue('firesafe_ai_sources_total{job="ai-worker"}'),
    queryVector('firesafe_ai_camera_running{job="ai-worker"}'),
    queryVector('firesafe_ai_camera_has_frame{job="ai-worker"}'),
    queryVector('firesafe_ai_camera_error{job="ai-worker"}'),
    queryVector('firesafe_ai_detections_total{job="ai-worker"}'),
    queryVector('firesafe_ai_alerts_sent_total{job="ai-worker"}'),
    queryVector('firesafe_ai_inference_ms_avg{job="ai-worker"}'),
    queryValue('up{job="redis"}'),
    queryValue('redis_memory_used_bytes{job="redis"}'),
    queryValue('sum(redis_db_keys{job="redis"})'),
    queryValue('up{job="mariadb"}'),
    queryValue('up{job="minio"}'),
    queryValue('up{job="rabbitmq"}'),
    queryValue('sum(rabbitmq_queue_messages{job="rabbitmq"})'),
    queryValue('sum(rabbitmq_queue_consumers{job="rabbitmq"})'),
    queryValue('up{job="node"}'),
    queryValue('avg(rate(node_cpu_seconds_total{job="node",mode="idle"}[5m]))'),
    queryValue('node_memory_MemTotal_bytes{job="node"}'),
    queryValue('node_memory_MemAvailable_bytes{job="node"}'),
    queryValue('max(node_filesystem_size_bytes{job="node",fstype!="rootfs"})'),
    queryValue('max(node_filesystem_avail_bytes{job="node",fstype!="rootfs"})'),
  ]);

  const cameras = new Map<number, NonNullable<DashboardMetrics["aiWorker"]["cameras"]>[number]>();
  const ensureCamera = (result: PrometheusResult) => {
    const cameraId = Number(result.metric.camera_id ?? 0);
    if (!cameraId) return null;
    const current = cameras.get(cameraId) ?? { cameraId };
    cameras.set(cameraId, current);
    return current;
  };

  aiCameraRunning.forEach((result) => {
    const camera = ensureCamera(result);
    if (camera) camera.running = metricNumber(result) === 1;
  });
  aiCameraHasFrame.forEach((result) => {
    const camera = ensureCamera(result);
    if (camera) camera.hasFrame = metricNumber(result) === 1;
  });
  aiCameraError.forEach((result) => {
    const camera = ensureCamera(result);
    if (camera) camera.hasError = metricNumber(result) === 1;
  });
  aiDetections.forEach((result) => {
    const camera = ensureCamera(result);
    if (camera) camera.detectionsTotal = metricNumber(result);
  });
  aiAlerts.forEach((result) => {
    const camera = ensureCamera(result);
    if (camera) camera.alertsSentTotal = metricNumber(result);
  });
  aiInferenceMs.forEach((result) => {
    const camera = ensureCamera(result);
    if (camera) camera.inferenceMsAvg = metricNumber(result);
  });

  const cpuPct = nodeUp ? Math.max(0, Math.min(100, (1 - cpuIdle) * 100)) : 0;
  const ramUsed = Math.max(0, ramTotal - ramAvailable);
  const diskUsed = Math.max(0, diskTotal - diskAvailable);

  return {
    generatedAt: new Date().toISOString(),
    backend: {
      status: statusFromUp(backendUp),
      requestsTotal: backendRequests,
      errorRate: rate(backendErrors, backendRequests),
      avgLatencyMs: backendLatencyMs,
      uptimeSeconds: backendUptime,
    },
    aiWorker: {
      status: statusFromUp(aiWorkerUp),
      workers: aiWorkers,
      sources: aiSources,
      cameras: Array.from(cameras.values()).sort((a, b) => a.cameraId - b.cameraId),
    },
    system: {
      cpuPct,
      ramUsedBytes: ramUsed,
      ramTotalBytes: ramTotal,
      diskUsedBytes: diskUsed,
      diskTotalBytes: diskTotal,
      gpu: { available: false },
    },
    infra: {
      mariadb: { status: statusFromUp(mariadbUp), tableCount: 0, rowCount: 0, bytes: 0 },
      minio: { status: statusFromUp(minioUp), objectCount: 0, bytes: 0 },
      redis: { status: statusFromUp(redisUp), usedMemoryBytes: redisMemory, keyCount: redisKeys },
      rabbitmq: { status: statusFromUp(rabbitmqUp), messages: rabbitmqMessages, consumers: rabbitmqConsumers },
    },
    alerts: {
      total: 0,
      newCount: 0,
      last24h: 0,
      highConfidenceLast24h: 0,
      byLabel: [],
      hourly: [],
    },
    cameras: {
      total: cameras.size,
      active: Array.from(cameras.values()).filter(camera => camera.running).length,
    },
  };
}

export const monitoringApi = {
  getDashboardMetrics() {
    const now = Date.now();
    if (!cache || cache.expiresAt <= now) {
      cache = { expiresAt: now + CACHE_TTL_MS, promise: buildDashboardMetrics() };
    }
    return cache.promise;
  },
};
