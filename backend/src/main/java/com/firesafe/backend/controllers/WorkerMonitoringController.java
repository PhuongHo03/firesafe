package com.firesafe.backend.controllers;

import com.firesafe.backend.services.WorkerClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/worker")
@RequiredArgsConstructor
@Tag(name = "Worker Monitoring", description = "Authenticated AI Worker monitoring gateway")
@SecurityRequirement(name = "bearerAuth")
public class WorkerMonitoringController {

    private final WorkerClient workerClient;

    @GetMapping("/monitoring/summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get AI Worker monitoring summary through backend gateway")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(workerClient.getMonitoringSummary());
    }
}
