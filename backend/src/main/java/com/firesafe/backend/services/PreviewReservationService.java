package com.firesafe.backend.services;

import com.firesafe.backend.dtos.AdminMetricsResponse;
import com.firesafe.backend.dtos.PreviewReservationResponse;
import com.firesafe.backend.dtos.PreviewReservationsResponse;
import com.firesafe.backend.repositories.CameraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PreviewReservationService {

    private static final String KEY_PREFIX = "preview:reservation:";

    private final StringRedisTemplate redisTemplate;
    private final CameraRepository cameraRepository;
    private final MonitoringService monitoringService;

    @Value("${preview.cpu-threshold:80}")
    private double cpuThreshold;

    @Value("${preview.ttl-seconds:120}")
    private long ttlSeconds;

    @Value("${preview.keepalive-seconds:30}")
    private long keepaliveSeconds;

    @Value("${preview.max-global:4}")
    private long maxGlobal;

    public PreviewReservationResponse reserve(String username, Long cameraId) {
        ensureCameraExists(cameraId);
        String key = reservationKey(username, cameraId);

        if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            redisTemplate.expire(key, Duration.ofSeconds(ttlSeconds));
            return success(cameraId);
        }

        long activeCount = activeReservationCount();
        if (activeCount >= maxGlobal) {
            return denied(cameraId, "Đã đạt giới hạn preview đang mở");
        }

        double cpuPct = currentCpuPct();
        if (cpuPct >= cpuThreshold) {
            return denied(cameraId, "Hệ thống gần quá tải (CPU " + Math.round(cpuPct) + "%). Tạm thời không mở thêm preview.");
        }

        redisTemplate.opsForValue().set(key, Instant.now().toString(), Duration.ofSeconds(ttlSeconds));
        return success(cameraId);
    }

    public PreviewReservationResponse keepAlive(String username, Long cameraId) {
        ensureCameraExists(cameraId);
        String key = reservationKey(username, cameraId);
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            return denied(cameraId, "Preview reservation đã hết hạn");
        }
        redisTemplate.expire(key, Duration.ofSeconds(ttlSeconds));
        return success(cameraId);
    }

    public PreviewReservationResponse release(String username, Long cameraId) {
        ensureCameraExists(cameraId);
        redisTemplate.delete(reservationKey(username, cameraId));
        return new PreviewReservationResponse(false, cameraId, 0, keepaliveSeconds, null);
    }

    public PreviewReservationsResponse listMine(String username) {
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + username + ":*");
        List<PreviewReservationResponse> reservations = keys == null ? List.of() : keys.stream()
                .map(this::cameraIdFromKey)
                .filter(Objects::nonNull)
                .sorted(Comparator.naturalOrder())
                .map(this::success)
                .toList();
        return new PreviewReservationsResponse(reservations);
    }

    private void ensureCameraExists(Long cameraId) {
        if (!cameraRepository.existsById(cameraId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Camera not found: " + cameraId);
        }
    }

    private double currentCpuPct() {
        try {
            AdminMetricsResponse metrics = monitoringService.getAdminMetrics();
            return metrics.getSystem().getCpuPct();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không thể kiểm tra tải hệ thống");
        }
    }

    private long activeReservationCount() {
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
        return keys == null ? 0 : keys.size();
    }

    private PreviewReservationResponse success(Long cameraId) {
        return new PreviewReservationResponse(true, cameraId, ttlSeconds, keepaliveSeconds, null);
    }

    private PreviewReservationResponse denied(Long cameraId, String reason) {
        return new PreviewReservationResponse(false, cameraId, 0, keepaliveSeconds, reason);
    }

    private String reservationKey(String username, Long cameraId) {
        return KEY_PREFIX + username + ":" + cameraId;
    }

    private Long cameraIdFromKey(String key) {
        try {
            return Long.parseLong(key.substring(key.lastIndexOf(':') + 1));
        } catch (Exception ex) {
            return null;
        }
    }
}
