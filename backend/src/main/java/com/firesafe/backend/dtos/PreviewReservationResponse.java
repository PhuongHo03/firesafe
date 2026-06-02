package com.firesafe.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PreviewReservationResponse {
    private boolean reserved;
    private Long cameraId;
    private long ttlSec;
    private long keepaliveSec;
    private String reason;
}
