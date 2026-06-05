package com.firesafe.backend.controllers;

import com.firesafe.backend.dtos.AlertRequest;
import com.firesafe.backend.dtos.AlertPageResponse;
import com.firesafe.backend.dtos.AlertReservationRequest;
import com.firesafe.backend.dtos.AlertReservationResponse;
import com.firesafe.backend.dtos.AlertResponse;
import com.firesafe.backend.services.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "Fire & smoke detection alerts")
@SecurityRequirement(name = "bearerAuth")
public class AlertController {

    private final AlertService alertService;

    @PostMapping("/reservations")
    @Operation(summary = "Reserve an alert debounce slot before snapshot upload")
    public ResponseEntity<AlertReservationResponse> reserveAlert(@Valid @RequestBody AlertReservationRequest request) {
        return ResponseEntity.ok(alertService.reserveAlert(request));
    }

    @PostMapping
    @Operation(summary = "Create a new alert (called by AI Worker)")
    public ResponseEntity<AlertResponse> createAlert(@Valid @RequestBody AlertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alertService.createAlert(request));
    }

    @GetMapping
    @Operation(summary = "List all alerts with pagination")
    public ResponseEntity<AlertPageResponse> getAlerts(
            @RequestParam(required = false) Long cameraId,
            @PageableDefault(size = 20, sort = "detectedAt") Pageable pageable) {
        return ResponseEntity.ok(alertService.getAlerts(cameraId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single alert by ID")
    public ResponseEntity<AlertResponse> getAlert(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.getAlertById(id));
    }

    @GetMapping("/{id}/image")
    @Operation(summary = "Get alert snapshot image through backend gateway")
    public ResponseEntity<byte[]> getAlertImage(@PathVariable Long id) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Cache-Control", "private, max-age=300")
                .body(alertService.getAlertImage(id));
    }

    @DeleteMapping
    @Operation(summary = "Delete all alerts")
    public ResponseEntity<Void> deleteAllAlerts() {
        alertService.deleteAllAlerts();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an alert")
    public ResponseEntity<Void> deleteAlert(@PathVariable Long id) {
        alertService.deleteAlert(id);
        return ResponseEntity.noContent().build();
    }
}
