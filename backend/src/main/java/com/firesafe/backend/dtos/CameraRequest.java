package com.firesafe.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CameraRequest {
    @NotBlank(message = "name is required")
    private String name;

    @NotBlank(message = "rtsp_url is required")
    private String rtspUrl;

    private String location;
    private boolean isActive = true;
}
