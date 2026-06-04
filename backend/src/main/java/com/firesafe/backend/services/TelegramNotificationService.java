package com.firesafe.backend.services;

import com.firesafe.backend.models.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class TelegramNotificationService {

    private static final String SEND_MESSAGE_API_URL = "https://api.telegram.org/bot{token}/sendMessage";
    private static final String SEND_PHOTO_API_URL = "https://api.telegram.org/bot{token}/sendPhoto";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

    @Value("${telegram.enabled:false}")
    private boolean enabled;

    @Value("${telegram.bot-token:}")
    private String botToken;

    @Value("${telegram.chat-id:}")
    private String chatId;

    private final MinioService minioService;
    private final RestTemplate restTemplate;

    public TelegramNotificationService(MinioService minioService, RestTemplateBuilder builder) {
        this.minioService = minioService;
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
        if (alert.getImageUrl() != null && !alert.getImageUrl().isBlank()) {
            boolean photoSent = doSendPhoto(alert.getImageUrl(), message);
            if (photoSent) {
                return true;
            }
            log.warn("Falling back to Telegram text notification for alert ID={}", alert.getId());
        }
        return doSendMessage(message);
    }

    private boolean doSendMessage(String message) {
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
                    SEND_MESSAGE_API_URL, HttpMethod.POST, request, String.class,
                    Map.of("token", botToken)
            );
            log.info("Telegram text notification sent. Status: {}", response.getStatusCode());
            return true;
        } catch (HttpClientErrorException e) {
            handleTelegramClientError(e);
            return false;
        } catch (Exception e) {
            log.error("Unexpected error sending Telegram notification: {}", e.getMessage());
            return false;
        }
    }

    private boolean doSendPhoto(String imageUrl, String caption) {
        byte[] imageBytes = loadImageBytes(imageUrl);
        if (imageBytes.length == 0) {
            return false;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("chat_id", chatId);
        body.add("caption", caption);
        body.add("parse_mode", "HTML");
        body.add("photo", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return filenameFromUrl(imageUrl);
            }
        });

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    SEND_PHOTO_API_URL, HttpMethod.POST, request, String.class,
                    Map.of("token", botToken)
            );
            log.info("Telegram photo notification sent. Status: {}", response.getStatusCode());
            return true;
        } catch (HttpClientErrorException e) {
            handleTelegramClientError(e);
            return false;
        } catch (Exception e) {
            log.error("Unexpected error sending Telegram photo notification: {}", e.getMessage());
            return false;
        }
    }

    private byte[] loadImageBytes(String imageUrl) {
        Optional<byte[]> minioBytes = minioService.readObjectBytesByUrl(imageUrl);
        if (minioBytes.isPresent() && minioBytes.get().length > 0) {
            return minioBytes.get();
        }
        return downloadImage(imageUrl);
    }

    private byte[] downloadImage(String imageUrl) {
        try {
            ResponseEntity<byte[]> response = restTemplate.getForEntity(imageUrl, byte[].class);
            byte[] body = response.getBody();
            return body == null ? new byte[0] : body;
        } catch (Exception e) {
            log.error("Failed to download alert snapshot for Telegram: {}", e.getMessage());
            return new byte[0];
        }
    }

    private String filenameFromUrl(String imageUrl) {
        try {
            String path = URI.create(imageUrl).getPath();
            int slashIndex = path.lastIndexOf('/');
            String filename = slashIndex >= 0 ? path.substring(slashIndex + 1) : path;
            return filename.isBlank() ? "alert-snapshot.png" : filename;
        } catch (Exception e) {
            return "alert-snapshot.png";
        }
    }

    private void handleTelegramClientError(HttpClientErrorException e) {
        if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
            log.warn("Telegram rate limit hit (429). Will retry.");
            throw new TelegramRateLimitException("Telegram rate limit exceeded", e);
        }
        if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
            log.error("Telegram bot blocked or quota exceeded (403). No retry.");
            throw new TelegramQuotaException("Telegram bot forbidden", e);
        }
        log.error("Telegram API error: {} — {}", e.getStatusCode(), responseBody(e));
    }

    private String responseBody(HttpClientErrorException e) {
        String body = e.getResponseBodyAsString();
        return body == null || body.isBlank() ? "empty response body" : body;
    }

    private String buildMessage(Alert alert) {
        return String.format(
                """
                🔥 <b>CẢNH BÁO CHÁY/KHÓI</b>
                
                📷 <b>Camera:</b> %s
                📍 <b>Vị trí:</b> %s
                🏷️ <b>Loại:</b> %s
                📊 <b>Độ tin cậy:</b> %.0f%%
                🕐 <b>Thời gian:</b> %s
                🆔 <b>Alert ID:</b> #%d
                """,
                alert.getCamera().getName(),
                alert.getCamera().getLocation() == null || alert.getCamera().getLocation().isBlank()
                        ? "Không xác định"
                        : alert.getCamera().getLocation(),
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
