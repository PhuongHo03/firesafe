package com.firesafe.backend.controllers;

import com.firesafe.backend.dtos.MetricsExportResponse;
import com.firesafe.backend.services.MetricsExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
@Tag(name = "Metrics Export", description = "Lightweight business metrics for monitoring service")
public class MetricsExportController {

    private final MetricsExportService metricsExportService;

    @GetMapping("/export")
    @Operation(summary = "Export alert and camera metrics for monitoring service")
    public ResponseEntity<MetricsExportResponse> export() {
        return ResponseEntity.ok(metricsExportService.export());
    }
}
