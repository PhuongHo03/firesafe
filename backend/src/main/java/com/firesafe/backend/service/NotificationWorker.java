package com.firesafe.backend.service;

import com.firesafe.backend.entity.Alert;
import com.firesafe.backend.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationWorker {

    private final AlertRepository alertRepository;
    private final TelegramNotificationService telegramService;

    @Value("${notification.retry.max-attempts:3}")
    private int maxAttempts;

    @Value("${notification.retry.initial-delay-ms:2000}")
    private long initialDelayMs;

    @Value("${notification.retry.multiplier:2.0}")
    private double multiplier;

    @RabbitListener(queues = "${rabbitmq.queue.notification:alert.notification.queue}")
    public void processNotification(Long alertId) {
        log.info("Received notification job for alert ID: {}", alertId);

        Alert alert = alertRepository.findById(alertId).orElse(null);
        if (alert == null) {
            log.warn("Alert ID {} not found in DB, skipping notification", alertId);
            return;
        }

        sendWithRetry(alert);
    }

    private void sendWithRetry(Alert alert) {
        long delay = initialDelayMs;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                boolean sent = telegramService.sendAlert(alert);
                if (sent) {
                    log.info("Notification sent successfully for alert ID: {} (attempt {})",
                            alert.getId(), attempt);
                    return;
                }
            } catch (TelegramNotificationService.TelegramRateLimitException e) {
                // HTTP 429: rate limit → chờ rồi retry với exponential backoff
                if (attempt < maxAttempts) {
                    log.warn("Rate limited (attempt {}/{}). Retrying in {}ms...",
                            attempt, maxAttempts, delay);
                    sleep(delay);
                    delay = (long) (delay * multiplier);
                } else {
                    log.error("Rate limit persists after {} attempts. Alert ID: {} notification dropped.",
                            maxAttempts, alert.getId());
                }
            } catch (TelegramNotificationService.TelegramQuotaException e) {
                // Quota exceeded / bot bị block → KHÔNG retry, alert admin
                log.error("Telegram quota exceeded or bot blocked. Alert ID: {}. " +
                        "Action required: check bot token or Telegram account limits.", alert.getId());
                notifyAdmin(alert);
                return;
            } catch (Exception e) {
                log.error("Unexpected error on attempt {}/{} for alert ID: {}: {}",
                        attempt, maxAttempts, alert.getId(), e.getMessage());
                if (attempt < maxAttempts) {
                    sleep(delay);
                    delay = (long) (delay * multiplier);
                }
            }
        }
    }

    /**
     * Khi notification channel không khả dụng, ghi log ở mức ERROR
     * để monitoring (Prometheus alert rule) hoặc admin có thể phát hiện.
     * TODO: có thể gửi email admin hoặc ghi vào bảng riêng trong DB.
     */
    private void notifyAdmin(Alert alert) {
        log.error("[ADMIN ALERT] Cannot send notification for alert ID={}. " +
                "Camera={}, Label={}, Time={}. " +
                "Notification channel unavailable.",
                alert.getId(),
                alert.getCamera().getName(),
                alert.getLabel(),
                alert.getDetectedAt());
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
