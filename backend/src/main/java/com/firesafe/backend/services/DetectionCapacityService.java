package com.firesafe.backend.services;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DetectionCapacityService {

    private final MonitoringService monitoringService;

    @Value("${detection.cpu-threshold:70}")
    private double cpuThreshold;

    @Value("${detection.gpu-threshold:80}")
    private double gpuThreshold;

    public CapacityCheckResult canStartDetection() {
        double cpuPct = monitoringService.getCurrentCpuPct();
        if (cpuPct >= cpuThreshold) {
            return CapacityCheckResult.denied("CPU " + Math.round(cpuPct) + "% quá cao để bật detection");
        }

        if (monitoringService.hasGpu()) {
            double gpuPct = monitoringService.getCurrentGpuUtilPct();
            if (gpuPct >= gpuThreshold) {
                return CapacityCheckResult.denied("GPU " + Math.round(gpuPct) + "% quá cao để bật detection");
            }
        }

        return CapacityCheckResult.allowed();
    }

    public static class CapacityCheckResult {
        private final boolean allowed;
        private final String reason;

        private CapacityCheckResult(boolean allowed, String reason) {
            this.allowed = allowed;
            this.reason = reason;
        }

        public static CapacityCheckResult allowed() {
            return new CapacityCheckResult(true, null);
        }

        public static CapacityCheckResult denied(String reason) {
            return new CapacityCheckResult(false, reason);
        }

        public boolean isAllowed() {
            return allowed;
        }

        public String getReason() {
            return reason;
        }
    }
}
