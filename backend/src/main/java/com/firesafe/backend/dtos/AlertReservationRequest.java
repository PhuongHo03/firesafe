package com.firesafe.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AlertReservationRequest {

    @NotNull(message = "camera_id is required")
    private Long cameraId;

    @NotBlank(message = "label is required")
    private String label;
}
