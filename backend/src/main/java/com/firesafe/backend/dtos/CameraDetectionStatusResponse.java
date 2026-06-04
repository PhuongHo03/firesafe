package com.firesafe.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CameraDetectionStatusResponse {
    private Long cameraId;
    private boolean running;
    private String error;
    private String lastAlertAt;
    private Boolean hasFrame;
    private Long detectionsTotal;
    private Long alertsSentTotal;
    private Double inferenceMsAvg;
}
