package com.firesafe.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class MetricsExportResponse {
    private LocalDateTime generatedAt;
    private AlertMetrics alerts;
    private CameraMetrics cameras;

    @Data
    @AllArgsConstructor
    public static class AlertMetrics {
        private long total;
        private long newCount;
        private long last24h;
        private long highConfidenceLast24h;
        private List<LabelCount> byLabel;
        private List<HourlyCount> hourly;
    }

    @Data
    @AllArgsConstructor
    public static class CameraMetrics {
        private long total;
        private long active;
    }

    @Data
    @AllArgsConstructor
    public static class LabelCount {
        private String label;
        private long count;
    }

    @Data
    @AllArgsConstructor
    public static class HourlyCount {
        private String hour;
        private long count;
    }
}
