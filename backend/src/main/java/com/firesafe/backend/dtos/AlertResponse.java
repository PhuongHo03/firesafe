package com.firesafe.backend.dtos;

import com.firesafe.backend.models.Alert;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AlertResponse {
    private Long id;
    private Long cameraId;
    private String cameraName;
    private String label;
    private BigDecimal confidence;
    private String imageUrl;
    private String status;
    private LocalDateTime detectedAt;
    private LocalDateTime createdAt;

    public static AlertResponse from(Alert alert) {
        AlertResponse dto = new AlertResponse();
        dto.id = alert.getId();
        dto.cameraId = alert.getCamera().getId();
        dto.cameraName = alert.getCamera().getName();
        dto.label = alert.getLabel();
        dto.confidence = alert.getConfidence();
        dto.imageUrl = alert.getImageUrl();
        dto.status = alert.getStatus();
        dto.detectedAt = alert.getDetectedAt();
        dto.createdAt = alert.getCreatedAt();
        return dto;
    }
}
