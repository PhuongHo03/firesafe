package com.firesafe.backend.controller;

import com.firesafe.backend.dto.MonitoringSummaryResponse;
import com.firesafe.backend.service.MonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitoring")
@RequiredArgsConstructor
@Tag(name = "Monitoring", description = "Runtime monitoring summary APIs")
public class MonitoringController {

    private final MonitoringService monitoringService;

    @GetMapping("/summary")
    @Operation(summary = "Get dashboard monitoring summary")
    public ResponseEntity<MonitoringSummaryResponse> getSummary() {
        return ResponseEntity.ok(monitoringService.getSummary());
    }
}
