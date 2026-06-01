package com.firesafe.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AlertRequest {

    @NotNull(message = "camera_id is required")
    private Long cameraId;

    @NotBlank(message = "label is required")
    private String label;

    @NotNull(message = "confidence is required")
    private BigDecimal confidence;

    private String imageUrl;

    @NotBlank(message = "reservation_token is required")
    private String reservationToken;

    @NotNull(message = "detected_at is required")
    private LocalDateTime detectedAt;
}
