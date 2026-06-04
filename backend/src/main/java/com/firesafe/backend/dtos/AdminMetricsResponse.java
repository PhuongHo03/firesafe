package com.firesafe.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminMetricsResponse {
    private Instant generatedAt;
    private BackendMetrics backend;
    private AiWorkerMetrics aiWorker;
    private NginxMetrics nginx;
    private EndpointProbeMetrics frontend;
    private SystemMetrics system;
    private InfraMetrics infra;
    private AlertMetrics alerts;
    private CameraMetrics cameras;

    @Data
    @AllArgsConstructor
    public static class BackendMetrics {
        private String status;
        private double requestsTotal;
        private double errorRate;
        private double avgLatencyMs;
        private double uptimeSeconds;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class AiWorkerMetrics {
        private String status;
        private double workers;
        private double sources;
        private List<AiCameraMetrics> cameras;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class AiCameraMetrics {
        private long cameraId;
        private Boolean running;
        private Boolean hasFrame;
        private Boolean hasError;
        private Double detectionsTotal;
        private Double alertsSentTotal;
        private Double inferenceMsAvg;
    }

    @Data
    @AllArgsConstructor
    public static class NginxMetrics {
        private String status;
        private double requestsPerSecond;
        private double activeConnections;
        private double readingConnections;
        private double writingConnections;
        private double waitingConnections;
        private double acceptedConnectionsPerSecond;
        private double handledConnectionsPerSecond;
        private EndpointProbeMetrics probe;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class EndpointProbeMetrics {
        private String status;
        private double durationSeconds;
        private double httpStatusCode;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class SystemMetrics {
        private double cpuPct;
        private double ramUsedBytes;
        private double ramTotalBytes;
        private double diskUsedBytes;
        private double diskTotalBytes;
        private GpuMetrics gpu;
    }

    @Data
    @AllArgsConstructor
    public static class GpuMetrics {
        private boolean available;
        private Double utilPct;
        private Double memoryUsedBytes;
        private Double memoryTotalBytes;
    }

    @Data
    @AllArgsConstructor
    public static class InfraMetrics {
        private StoreMetrics mariadb;
        private StoreMetrics minio;
        private RedisMetrics redis;
        private RabbitMetrics rabbitmq;
    }

    @Data
    @AllArgsConstructor
    public static class StoreMetrics {
        private String status;
        private double tableCount;
        private double rowCount;
        private double bytes;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class RedisMetrics {
        private String status;
        private double usedMemoryBytes;
        private double keyCount;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class RabbitMetrics {
        private String status;
        private double messages;
        private double consumers;
        private String error;
    }

    @Data
    @AllArgsConstructor
    public static class AlertMetrics {
        private long total;
        private long newCount;
        private long last24h;
        private long highConfidenceLast24h;
        private List<LabelCount> byLabel;
        private List<HourCount> hourly;
    }

    @Data
    @AllArgsConstructor
    public static class LabelCount {
        private String label;
        private long count;
    }

    @Data
    @AllArgsConstructor
    public static class HourCount {
        private String hour;
        private long count;
    }

    @Data
    @AllArgsConstructor
    public static class CameraMetrics {
        private long total;
        private long active;
    }
}
