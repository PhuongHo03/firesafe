package com.firesafe.backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.firesafe.backend.dtos.AdminMetricsResponse;
import com.firesafe.backend.dtos.MonitoringSummaryResponse;
import com.firesafe.backend.repositories.AlertRepository;
import com.firesafe.backend.repositories.CameraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MonitoringService {

    private static final String ADMIN_METRICS_CACHE_KEY = "admin:metrics:snapshot";
    private static final Duration ADMIN_METRICS_CACHE_TTL = Duration.ofSeconds(10);

    private final AlertRepository alertRepository;
    private final CameraRepository cameraRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${firesafe.prometheus.base-url:http://localhost:9090}")
    private String prometheusBaseUrl;

    @Transactional(readOnly = true)
    public MonitoringSummaryResponse getSummary() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);

        return new MonitoringSummaryResponse(
                new MonitoringSummaryResponse.BackendSummary("UP"),
                new MonitoringSummaryResponse.AlertSummary(
                        alertRepository.count(),
                        alertRepository.countByStatus("NEW"),
                        alertRepository.countByDetectedAtAfter(last24h),
                        alertRepository.countByDetectedAtAfterAndConfidenceGreaterThanEqual(last24h, new BigDecimal("0.9000"))
                ),
                new MonitoringSummaryResponse.CameraSummary(
                        cameraRepository.count(),
                        cameraRepository.countByIsActiveTrue()
                ),
                now
        );
    }

    @Transactional(readOnly = true)
    public AdminMetricsResponse getAdminMetrics() {
        AdminMetricsResponse cached = readCachedAdminMetrics();
        if (cached != null) {
            return cached;
        }

        AdminMetricsResponse metrics = buildAdminMetrics();
        writeCachedAdminMetrics(metrics);
        return metrics;
    }

    public double getCurrentCpuPct() {
        try {
            double nodeUp = queryValue("up{job=\"node\"}");
            if (nodeUp < 1) return 0;
            double cpuIdle = queryValue("avg(rate(node_cpu_seconds_total{job=\"node\",mode=\"idle\"}[5m]))");
            return clamp((1 - cpuIdle) * 100, 0, 100);
        } catch (Exception ex) {
            return 0;
        }
    }

    public double getCurrentGpuUtilPct() {
        try {
            return queryValue("dcgm_gpu_utilization{job=\"gpu\"}");
        } catch (Exception ex) {
            return 0;
        }
    }

    public boolean hasGpu() {
        try {
            return queryValue("up{job=\"gpu\"}") >= 1;
        } catch (Exception ex) {
            return false;
        }
    }

    private AdminMetricsResponse readCachedAdminMetrics() {
        try {
            String cached = redisTemplate.opsForValue().get(ADMIN_METRICS_CACHE_KEY);
            return cached == null ? null : objectMapper.readValue(cached, AdminMetricsResponse.class);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void writeCachedAdminMetrics(AdminMetricsResponse metrics) {
        try {
            redisTemplate.opsForValue().set(
                    ADMIN_METRICS_CACHE_KEY,
                    objectMapper.writeValueAsString(metrics),
                    ADMIN_METRICS_CACHE_TTL
            );
        } catch (Exception ignored) {
            // Metrics should still be available if Redis is temporarily unavailable.
        }
    }

    private AdminMetricsResponse buildAdminMetrics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);
        String prometheusError = null;

        double backendUp = 0;
        double backendRequests = 0;
        double backendErrors = 0;
        double backendLatencyMs = 0;
        double backendUptime = 0;
        double aiWorkerUp = 0;
        double aiWorkers = 0;
        double aiSources = 0;
        double redisUp = 0;
        double redisMemory = 0;
        double redisKeys = 0;
        double mariadbUp = 0;
        double minioUp = 0;
        double rabbitmqUp = 0;
        double rabbitmqMessages = 0;
        double rabbitmqConsumers = 0;
        double nodeUp = 0;
        double cpuIdle = 0;
        double ramTotal = 0;
        double ramAvailable = 0;
        double diskTotal = 0;
        double diskAvailable = 0;
        List<PrometheusResult> aiCameraRunning = List.of();
        List<PrometheusResult> aiCameraHasFrame = List.of();
        List<PrometheusResult> aiCameraError = List.of();
        List<PrometheusResult> aiDetections = List.of();
        List<PrometheusResult> aiAlerts = List.of();
        List<PrometheusResult> aiInferenceMs = List.of();

        try {
            backendUp = queryValue("up{job=\"backend\"}");
            backendRequests = queryValue("sum(http_server_requests_seconds_count{job=\"backend\"})");
            backendErrors = queryValue("sum(http_server_requests_seconds_count{job=\"backend\",status=~\"5..\"})");
            backendLatencyMs = queryValue("sum(http_server_requests_seconds_sum{job=\"backend\"}) / sum(http_server_requests_seconds_count{job=\"backend\"}) * 1000");
            backendUptime = queryValue("process_uptime_seconds{job=\"backend\"}");
            aiWorkerUp = queryValue("up{job=\"ai-worker\"}");
            aiWorkers = queryValue("firesafe_ai_workers_total{job=\"ai-worker\"}");
            aiSources = queryValue("firesafe_ai_sources_total{job=\"ai-worker\"}");
            aiCameraRunning = queryVector("firesafe_ai_camera_running{job=\"ai-worker\"}");
            aiCameraHasFrame = queryVector("firesafe_ai_camera_has_frame{job=\"ai-worker\"}");
            aiCameraError = queryVector("firesafe_ai_camera_error{job=\"ai-worker\"}");
            aiDetections = queryVector("firesafe_ai_detections_total{job=\"ai-worker\"}");
            aiAlerts = queryVector("firesafe_ai_alerts_sent_total{job=\"ai-worker\"}");
            aiInferenceMs = queryVector("firesafe_ai_inference_ms_avg{job=\"ai-worker\"}");
            redisUp = queryValue("up{job=\"redis\"}");
            redisMemory = queryValue("redis_memory_used_bytes{job=\"redis\"}");
            redisKeys = queryValue("sum(redis_db_keys{job=\"redis\"})");
            mariadbUp = queryValue("up{job=\"mariadb\"}");
            minioUp = queryValue("up{job=\"minio\"}");
            rabbitmqUp = queryValue("up{job=\"rabbitmq\"}");
            rabbitmqMessages = queryValue("sum(rabbitmq_queue_messages{job=\"rabbitmq\"})");
            rabbitmqConsumers = queryValue("sum(rabbitmq_queue_consumers{job=\"rabbitmq\"})");
            nodeUp = queryValue("up{job=\"node\"}");
            cpuIdle = queryValue("avg(rate(node_cpu_seconds_total{job=\"node\",mode=\"idle\"}[5m]))");
            ramTotal = queryValue("node_memory_MemTotal_bytes{job=\"node\"}");
            ramAvailable = queryValue("node_memory_MemAvailable_bytes{job=\"node\"}");
            diskTotal = queryValue("max(node_filesystem_size_bytes{job=\"node\",fstype!=\"rootfs\"})");
            diskAvailable = queryValue("max(node_filesystem_avail_bytes{job=\"node\",fstype!=\"rootfs\"})");
        } catch (Exception ex) {
            prometheusError = "Prometheus unavailable";
        }

        List<AdminMetricsResponse.AiCameraMetrics> aiCameras = buildAiCameras(
                aiCameraRunning,
                aiCameraHasFrame,
                aiCameraError,
                aiDetections,
                aiAlerts,
                aiInferenceMs
        );
        double cpuPct = nodeUp >= 1 ? clamp((1 - cpuIdle) * 100, 0, 100) : 0;
        double ramUsed = Math.max(0, ramTotal - ramAvailable);
        double diskUsed = Math.max(0, diskTotal - diskAvailable);

        return new AdminMetricsResponse(
                Instant.now(),
                new AdminMetricsResponse.BackendMetrics(
                        statusFromUp(backendUp),
                        backendRequests,
                        rate(backendErrors, backendRequests),
                        backendLatencyMs,
                        backendUptime,
                        prometheusError
                ),
                new AdminMetricsResponse.AiWorkerMetrics(
                        statusFromUp(aiWorkerUp),
                        aiWorkers,
                        aiSources,
                        aiCameras,
                        prometheusError
                ),
                new AdminMetricsResponse.SystemMetrics(
                        cpuPct,
                        ramUsed,
                        ramTotal,
                        diskUsed,
                        diskTotal,
                        new AdminMetricsResponse.GpuMetrics(false, null, null, null)
                ),
                new AdminMetricsResponse.InfraMetrics(
                        new AdminMetricsResponse.StoreMetrics(statusFromUp(mariadbUp), 0, 0, 0, prometheusError),
                        new AdminMetricsResponse.StoreMetrics(statusFromUp(minioUp), 0, 0, 0, prometheusError),
                        new AdminMetricsResponse.RedisMetrics(statusFromUp(redisUp), redisMemory, redisKeys, prometheusError),
                        new AdminMetricsResponse.RabbitMetrics(statusFromUp(rabbitmqUp), rabbitmqMessages, rabbitmqConsumers, prometheusError)
                ),
                new AdminMetricsResponse.AlertMetrics(
                        alertRepository.count(),
                        alertRepository.countByStatus("NEW"),
                        alertRepository.countByDetectedAtAfter(last24h),
                        alertRepository.countByDetectedAtAfterAndConfidenceGreaterThanEqual(last24h, new BigDecimal("0.9000")),
                        List.of(),
                        List.of()
                ),
                new AdminMetricsResponse.CameraMetrics(
                        cameraRepository.count(),
                        aiCameras.stream().filter(camera -> Boolean.TRUE.equals(camera.getRunning())).count()
                )
        );
    }

    private double queryValue(String query) {
        JsonNode root = queryPrometheus(query);
        JsonNode value = root.path("data").path("result").path(0).path("value").path(1);
        return parseDouble(value.asText("0"));
    }

    private List<PrometheusResult> queryVector(String query) {
        JsonNode root = queryPrometheus(query);
        List<PrometheusResult> results = new ArrayList<>();
        for (JsonNode result : root.path("data").path("result")) {
            Map<String, String> metric = new HashMap<>();
            result.path("metric").fields().forEachRemaining(entry -> metric.put(entry.getKey(), entry.getValue().asText()));
            double value = parseDouble(result.path("value").path(1).asText("0"));
            results.add(new PrometheusResult(metric, value));
        }
        return results;
    }

    private JsonNode queryPrometheus(String query) {
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        return RestClient.create()
                .get()
                .uri(URI.create(prometheusBaseUrl + "/api/v1/query?query=" + encodedQuery))
                .retrieve()
                .body(JsonNode.class);
    }

    private List<AdminMetricsResponse.AiCameraMetrics> buildAiCameras(
            List<PrometheusResult> running,
            List<PrometheusResult> hasFrame,
            List<PrometheusResult> hasError,
            List<PrometheusResult> detections,
            List<PrometheusResult> alerts,
            List<PrometheusResult> inferenceMs
    ) {
        Map<Long, AdminMetricsResponse.AiCameraMetrics> cameras = new HashMap<>();
        running.forEach(result -> ensureCamera(cameras, result).setRunning(result.value() == 1));
        hasFrame.forEach(result -> ensureCamera(cameras, result).setHasFrame(result.value() == 1));
        hasError.forEach(result -> ensureCamera(cameras, result).setHasError(result.value() == 1));
        detections.forEach(result -> ensureCamera(cameras, result).setDetectionsTotal(result.value()));
        alerts.forEach(result -> ensureCamera(cameras, result).setAlertsSentTotal(result.value()));
        inferenceMs.forEach(result -> ensureCamera(cameras, result).setInferenceMsAvg(result.value()));
        return cameras.values().stream().sorted(Comparator.comparingLong(AdminMetricsResponse.AiCameraMetrics::getCameraId)).toList();
    }

    private AdminMetricsResponse.AiCameraMetrics ensureCamera(Map<Long, AdminMetricsResponse.AiCameraMetrics> cameras, PrometheusResult result) {
        long cameraId = parseLong(result.metric().get("camera_id"));
        return cameras.computeIfAbsent(cameraId, id -> new AdminMetricsResponse.AiCameraMetrics(id, null, null, null, null, null, null));
    }

    private String statusFromUp(double value) {
        return value >= 1 ? "UP" : "DOWN";
    }

    private double rate(double errors, double total) {
        return total > 0 ? errors / total : 0;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double parseDouble(String value) {
        try {
            double parsed = Double.parseDouble(value);
            return Double.isFinite(parsed) ? parsed : 0;
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private long parseLong(String value) {
        try {
            return Long.parseLong(value == null ? "0" : value);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private record PrometheusResult(Map<String, String> metric, double value) {
    }
}
