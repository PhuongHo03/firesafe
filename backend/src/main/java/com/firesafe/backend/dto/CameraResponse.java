package com.firesafe.backend.dto;

import com.firesafe.backend.entity.Camera;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CameraResponse {
    private Long id;
    private String name;
    private String rtspUrl;
    private String location;
    private boolean isActive;
    private LocalDateTime createdAt;

    public static CameraResponse from(Camera camera) {
        CameraResponse dto = new CameraResponse();
        dto.id = camera.getId();
        dto.name = camera.getName();
        dto.rtspUrl = camera.getRtspUrl();
        dto.location = camera.getLocation();
        dto.isActive = camera.isActive();
        dto.createdAt = camera.getCreatedAt();
        return dto;
    }
}
