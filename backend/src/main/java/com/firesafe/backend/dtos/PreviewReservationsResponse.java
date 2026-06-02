package com.firesafe.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PreviewReservationsResponse {
    private List<PreviewReservationResponse> reservations;
}
