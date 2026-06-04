package com.firesafe.backend.controllers;

import com.firesafe.backend.services.DetectionCapacityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/detection")
@RequiredArgsConstructor
@Tag(name = "Detection Capacity", description = "Detection capacity management")
@SecurityRequirement(name = "bearerAuth")
public class DetectionCapacityController {

    private final DetectionCapacityService detectionCapacityService;

    @GetMapping("/capacity")
    @Operation(summary = "Check if system can start new detection")
    public ResponseEntity<CapacityResponse> checkCapacity() {
        DetectionCapacityService.CapacityCheckResult result = detectionCapacityService.canStartDetection();
        CapacityResponse response = new CapacityResponse(result.isAllowed(), result.getReason());
        return result.isAllowed() ? ResponseEntity.ok(response) : ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CapacityResponse {
        private boolean allowed;
        private String reason;
    }
}
