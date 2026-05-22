package com.firesafe.backend.controller;

import com.firesafe.backend.dto.AlertRequest;
import com.firesafe.backend.dto.AlertResponse;
import com.firesafe.backend.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "Fire & smoke detection alerts")
@SecurityRequirement(name = "bearerAuth")
public class AlertController {

    private final AlertService alertService;

    @PostMapping
    @Operation(summary = "Create a new alert (called by AI Worker)")
    public ResponseEntity<AlertResponse> createAlert(@Valid @RequestBody AlertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alertService.createAlert(request));
    }

    @GetMapping
    @Operation(summary = "List all alerts with pagination")
    public ResponseEntity<Page<AlertResponse>> getAlerts(
            @RequestParam(required = false) Long cameraId,
            @PageableDefault(size = 20, sort = "detectedAt") Pageable pageable) {
        return ResponseEntity.ok(alertService.getAlerts(cameraId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single alert by ID")
    public ResponseEntity<AlertResponse> getAlert(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.getAlertById(id));
    }
}
