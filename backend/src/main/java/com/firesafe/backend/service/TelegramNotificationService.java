package com.firesafe.backend.service;

import com.firesafe.backend.entity.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Service
public class TelegramNotificationService {

    private static final String API_URL = "https://api.telegram.org/bot{token}/sendMessage";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

    @Value("${telegram.enabled:false}")
    private boolean enabled;

    @Value("${telegram.bot-token:}")
    private String botToken;

    @Value("${telegram.chat-id:}")
    private String chatId;

    private final RestTemplate restTemplate;

    public TelegramNotificationService(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    /**
     * Gửi cảnh báo đến Telegram.
     *
     * @return true nếu gửi thành công
     * @throws TelegramRateLimitException nếu bị rate limit (HTTP 429)
     * @throws TelegramQuotaException     nếu quota exceeded (bot bị block)
     */
    public boolean sendAlert(Alert alert) {
        if (!enabled) {
            log.info("[Telegram DISABLED] Would send alert ID={} camera={}",
                    alert.getId(), alert.getCamera().getName());
            return true;
        }

        String message = buildMessage(alert);
        return doSend(message);
    }

    private boolean doSend(String message) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", message,
                "parse_mode", "HTML"
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    API_URL, HttpMethod.POST, request, String.class,
                    Map.of("token", botToken)
            );
            log.info("Telegram notification sent. Status: {}", response.getStatusCode());
            return true;
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                log.warn("Telegram rate limit hit (429). Will retry.");
                throw new TelegramRateLimitException("Telegram rate limit exceeded", e);
            }
            if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
                log.error("Telegram bot blocked or quota exceeded (403). No retry.");
                throw new TelegramQuotaException("Telegram bot forbidden", e);
            }
            log.error("Telegram API error: {} — {}", e.getStatusCode(), e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error sending Telegram notification: {}", e.getMessage());
            return false;
        }
    }

    private String buildMessage(Alert alert) {
        return String.format(
                """
                🔥 <b>CẢNH BÁO CHÁY/KHÓI</b>
                
                📷 <b>Camera:</b> %s
                🏷️ <b>Loại:</b> %s
                📊 <b>Độ tin cậy:</b> %.0f%%
                🕐 <b>Thời gian:</b> %s
                🆔 <b>Alert ID:</b> #%d
                """,
                alert.getCamera().getName(),
                alert.getLabel().toUpperCase(),
                alert.getConfidence().doubleValue() * 100,
                alert.getDetectedAt().format(FORMATTER),
                alert.getId()
        );
    }

    // --- Custom exceptions để phân biệt loại lỗi trong retry logic ---

    public static class TelegramRateLimitException extends RuntimeException {
        public TelegramRateLimitException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class TelegramQuotaException extends RuntimeException {
        public TelegramQuotaException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
