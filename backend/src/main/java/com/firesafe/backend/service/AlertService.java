package com.firesafe.backend.service;

import com.firesafe.backend.dto.AlertRequest;
import com.firesafe.backend.dto.AlertResponse;
import com.firesafe.backend.entity.Alert;
import com.firesafe.backend.entity.Camera;
import com.firesafe.backend.repository.AlertRepository;
import com.firesafe.backend.repository.CameraRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final CameraRepository cameraRepository;
    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;

    @Value("${alert.debounce-ttl-seconds:300}")
    private long debounceTtlSeconds;

    @Value("${rabbitmq.exchange:alert.exchange}")
    private String exchange;

    @Value("${rabbitmq.routing-key.notification:alert.notification}")
    private String notificationRoutingKey;

    @Transactional
    public AlertResponse createAlert(AlertRequest request) {
        Camera camera = cameraRepository.findById(request.getCameraId())
                .orElseThrow(() -> new IllegalArgumentException("Camera not found: " + request.getCameraId()));

        Alert alert = new Alert();
        alert.setCamera(camera);
        alert.setLabel(request.getLabel());
        alert.setConfidence(request.getConfidence());
        alert.setImageUrl(request.getImageUrl());
        alert.setDetectedAt(request.getDetectedAt());
        Alert saved = alertRepository.save(alert);

        // Debounce: only send notification if no recent alert from this camera
        String debounceKey = "alert:debounce:" + camera.getId();
        Boolean isFirstAlert = redisTemplate.opsForValue().setIfAbsent(
                debounceKey, String.valueOf(saved.getId()), Duration.ofSeconds(debounceTtlSeconds)
        );

        if (Boolean.TRUE.equals(isFirstAlert)) {
            log.info("New alert from camera {}, sending notification. Alert ID: {}", camera.getId(), saved.getId());
            rabbitTemplate.convertAndSend(exchange, notificationRoutingKey, saved.getId());
        } else {
            log.debug("Debounced alert from camera {} (alert ID: {})", camera.getId(), saved.getId());
        }

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
}
