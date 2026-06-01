package com.firesafe.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AlertReservationResponse {
    private boolean reserved;
    private String reservationToken;
    private long ttlSeconds;
}
