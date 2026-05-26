package com.firesafe.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class MonitoringSummaryResponse {
    private BackendSummary backend;
    private AlertSummary alerts;
    private CameraSummary cameras;
    private LocalDateTime generatedAt;

    @Data
    @AllArgsConstructor
    public static class BackendSummary {
        private String status;
    }

    @Data
    @AllArgsConstructor
    public static class AlertSummary {
        private long total;
        private long newCount;
        private long last24h;
        private long highConfidenceLast24h;
    }

    @Data
    @AllArgsConstructor
    public static class CameraSummary {
        private long total;
        private long active;
    }
}
