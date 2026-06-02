package com.firesafe.backend.controllers;

import com.firesafe.backend.dtos.AdminMetricsResponse;
import com.firesafe.backend.services.MonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Metrics", description = "Admin-only runtime metrics APIs")
public class AdminMetricsController {

    private final MonitoringService monitoringService;

    @GetMapping("/metrics")
    @Operation(summary = "Get normalized admin metrics dashboard snapshot")
    public ResponseEntity<AdminMetricsResponse> getMetrics() {
        return ResponseEntity.ok(monitoringService.getAdminMetrics());
    }
}
