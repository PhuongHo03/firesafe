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

    public PreviewReservationResponse reserve(String username, Long cameraId) {
        ensureCameraExists(cameraId);
        String key = reservationKey(username, cameraId);

        if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            redisTemplate.expire(key, Duration.ofSeconds(ttlSeconds));
            return success(cameraId);
        }

        double cpuPct = monitoringService.getCurrentCpuPct();
        if (cpuPct >= cpuThreshold) {
            return denied(cameraId, "CPU " + Math.round(cpuPct) + "% quá cao để stream preview");
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
