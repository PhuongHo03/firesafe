package com.firesafe.backend.dto;

import com.firesafe.backend.entity.Camera;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CameraRequest {
    @NotBlank(message = "name is required")
    private String name;

    @NotBlank(message = "rtsp_url is required")
    private String rtspUrl;

    private String location;
    private boolean isActive = true;
}
