package com.firesafe.backend.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.firesafe.backend.dtos.CameraDetectionStatusResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
public class WorkerClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public WorkerClient(
            RestTemplateBuilder builder,
            ObjectMapper objectMapper,
            @Value("${firesafe.ai-worker.base-url:http://localhost:8090}") String baseUrl) {
        this.restTemplate = builder.build();
        this.objectMapper = objectMapper;
        this.baseUrl = trimTrailingSlash(baseUrl);
    }

    public CameraDetectionStatusResponse startCamera(Long cameraId, String rtspUrl) {
        return postStatus("/api/cameras/start", Map.of("cameraId", cameraId, "rtspUrl", rtspUrl));
    }

    public CameraDetectionStatusResponse stopCamera(Long cameraId) {
        return postStatus("/api/cameras/stop", Map.of("cameraId", cameraId));
    }

    public CameraDetectionStatusResponse getCameraStatus(Long cameraId) {
        try {
            CameraDetectionStatusResponse response = restTemplate.getForObject(
                    uri("/api/cameras/" + cameraId + "/status"),
                    CameraDetectionStatusResponse.class
            );
            return response == null ? stoppedStatus(cameraId) : response;
        } catch (RestClientResponseException ex) {
            throw workerException(ex);
        } catch (Exception ex) {
            log.warn("Failed to get worker camera status for camera {}", cameraId, ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Worker is unavailable");
        }
    }

    public Map<String, Object> getMonitoringSummary() {
        try {
            Map<String, Object> summary = restTemplate.exchange(
                    uri("/api/monitoring/summary"),
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            ).getBody();
            return summary == null ? Map.of() : summary;
        } catch (RestClientResponseException ex) {
            throw workerException(ex);
        } catch (Exception ex) {
            log.warn("Failed to get worker monitoring summary", ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Worker is unavailable");
        }
    }

    public void streamCamera(Long cameraId, OutputStream outputStream) {
        try {
            restTemplate.execute(
                    uri("/api/cameras/" + cameraId + "/stream.mjpg"),
                    HttpMethod.GET,
                    null,
                    response -> {
                        Objects.requireNonNull(response.getBody(), "Worker stream response has no body")
                                .transferTo(outputStream);
                        outputStream.flush();
                        return null;
                    }
            );
        } catch (RestClientResponseException ex) {
            throw workerException(ex);
        } catch (Exception ex) {
            log.debug("Camera stream ended for camera {}: {}", cameraId, ex.getMessage());
        }
    }

    private CameraDetectionStatusResponse postStatus(String path, Map<String, Object> payload) {
        try {
            CameraDetectionStatusResponse response = restTemplate.postForObject(
                    uri(path),
                    jsonEntity(payload),
                    CameraDetectionStatusResponse.class
            );
            Object id = payload.get("cameraId");
            return response == null ? stoppedStatus(Long.valueOf(String.valueOf(id))) : response;
        } catch (RestClientResponseException ex) {
            throw workerException(ex);
        } catch (Exception ex) {
            log.warn("Failed to call worker endpoint {}", path, ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Worker is unavailable");
        }
    }

    private HttpEntity<String> jsonEntity(Map<String, Object> payload) throws JsonProcessingException {
        String body = objectMapper.writeValueAsString(payload);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setContentLength(body.getBytes(StandardCharsets.UTF_8).length);
        return new HttpEntity<>(body, headers);
    }

    private ResponseStatusException workerException(RestClientResponseException ex) {
        HttpStatus status = ex.getStatusCode().is4xxClientError() ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY;
        String message = ex.getResponseBodyAsString();
        if (message == null || message.isBlank()) {
            message = "AI Worker request failed";
        }
        return new ResponseStatusException(status, message);
    }

    private CameraDetectionStatusResponse stoppedStatus(Long cameraId) {
        return new CameraDetectionStatusResponse(cameraId, false, null, null, false, null, null, null);
    }

    private URI uri(String path) {
        return URI.create(baseUrl + path);
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
