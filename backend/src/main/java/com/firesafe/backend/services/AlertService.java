package com.firesafe.backend.services;

import com.firesafe.backend.dtos.AlertRequest;
import com.firesafe.backend.dtos.AlertReservationRequest;
import com.firesafe.backend.dtos.AlertReservationResponse;
import com.firesafe.backend.dtos.AlertResponse;
import com.firesafe.backend.models.Alert;
import com.firesafe.backend.models.Camera;
import com.firesafe.backend.repositories.AlertRepository;
import com.firesafe.backend.repositories.CameraRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private static final DefaultRedisScript<Long> DELETE_DEBOUNCE_IF_MATCHES = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class
    );

    private static final DefaultRedisScript<Long> FINALIZE_RESERVATION_IF_MATCHES = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then redis.call('set', KEYS[1], ARGV[2], 'EX', ARGV[3]) return 1 else return 0 end",
            Long.class
    );

    private final AlertRepository alertRepository;
    private final CameraRepository cameraRepository;
    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final MinioService minioService;

    @Value("${alert.debounce-ttl-seconds:300}")
    private long debounceTtlSeconds;

    @Value("${rabbitmq.exchange:alert.exchange}")
    private String exchange;

    @Value("${rabbitmq.routing-key.notification:alert.notification}")
    private String notificationRoutingKey;

    public AlertReservationResponse reserveAlert(AlertReservationRequest request) {
        Camera camera = cameraRepository.findById(request.getCameraId())
                .orElseThrow(() -> new IllegalArgumentException("Camera not found: " + request.getCameraId()));

        String token = UUID.randomUUID().toString();
        String debounceKey = getDebounceKey(camera.getId(), request.getLabel());
        Boolean reserved = redisTemplate.opsForValue().setIfAbsent(
                debounceKey, reservationValue(token), Duration.ofSeconds(debounceTtlSeconds)
        );

        if (Boolean.TRUE.equals(reserved)) {
            return new AlertReservationResponse(true, token, debounceTtlSeconds);
        }
        return new AlertReservationResponse(false, null, debounceTtlSeconds);
    }

    @Transactional
    public AlertResponse createAlert(AlertRequest request) {
        Camera camera = cameraRepository.findById(request.getCameraId())
                .orElseThrow(() -> new IllegalArgumentException("Camera not found: " + request.getCameraId()));

        String debounceKey = getDebounceKey(camera.getId(), request.getLabel());
        String expectedReservation = reservationValue(request.getReservationToken());
        if (!expectedReservation.equals(redisTemplate.opsForValue().get(debounceKey))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Alert reservation missing or expired");
        }

        Alert alert = new Alert();
        alert.setCamera(camera);
        alert.setLabel(request.getLabel());
        alert.setConfidence(request.getConfidence());
        alert.setImageUrl(request.getImageUrl());
        alert.setDetectedAt(request.getDetectedAt());
        Alert saved = alertRepository.save(alert);

        Long finalized = redisTemplate.execute(
                FINALIZE_RESERVATION_IF_MATCHES,
                List.of(debounceKey),
                expectedReservation,
                alertValue(saved.getId()),
                String.valueOf(debounceTtlSeconds)
        );
        if (!Long.valueOf(1).equals(finalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Alert reservation missing or expired");
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                log.info("New alert from camera {}, sending notification. Alert ID: {}", camera.getId(), saved.getId());
                rabbitTemplate.convertAndSend(exchange, notificationRoutingKey, saved.getId());
            }
        });

        return AlertResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<AlertResponse> getAlerts(Long cameraId, Pageable pageable) {
        Page<Alert> alerts = (cameraId != null)
                ? alertRepository.findByCameraIdOrderByDetectedAtDesc(cameraId, pageable)
                : alertRepository.findAllByOrderByDetectedAtDesc(pageable);
        return alerts.map(AlertResponse::from);
    }

    @Transactional(readOnly = true)
    public AlertResponse getAlertById(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + id));
        return AlertResponse.from(alert);
    }

    @Transactional
    public void deleteAlert(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found: " + id));
        deleteAlert(alert);
    }

    @Transactional
    public void deleteAllAlerts() {
        alertRepository.findAll().forEach(this::deleteAlert);
    }

    private void deleteAlert(Alert alert) {
        Long cameraId = alert.getCamera().getId();
        String label = alert.getLabel();
        String imageUrl = alert.getImageUrl();
        String alertId = String.valueOf(alert.getId());

        alertRepository.delete(alert);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                cleanupDeletedAlert(cameraId, label, alertId, imageUrl);
            }
        });
    }

    private void cleanupDeletedAlert(Long cameraId, String label, String alertId, String imageUrl) {
        try {
            redisTemplate.execute(DELETE_DEBOUNCE_IF_MATCHES, List.of(getDebounceKey(cameraId, label)), alertValue(Long.valueOf(alertId)));
        } catch (Exception e) {
            log.warn("Failed to cleanup Redis debounce for alert {}", alertId, e);
        }

        if (imageUrl != null && !imageUrl.isBlank()) {
            minioService.deleteObjectByUrl(imageUrl);
        }
    }

    private String getDebounceKey(Long cameraId, String label) {
        return "alert:debounce:" + cameraId + ":" + label;
    }

    private String reservationValue(String token) {
        return "reservation:" + token;
    }

    private String alertValue(Long alertId) {
        return "alert:" + alertId;
    }
}
