package com.firesafe.backend.controllers;

import com.firesafe.backend.dtos.CameraRequest;
import com.firesafe.backend.dtos.CameraResponse;
import com.firesafe.backend.services.CameraService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cameras")
@RequiredArgsConstructor
@Tag(name = "Cameras", description = "Camera management")
@SecurityRequirement(name = "bearerAuth")
public class CameraController {

    private final CameraService cameraService;

    @GetMapping
    @Operation(summary = "List all cameras")
    public ResponseEntity<List<CameraResponse>> getAllCameras() {
        return ResponseEntity.ok(cameraService.getAllCameras());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get camera by ID")
    public ResponseEntity<CameraResponse> getCamera(@PathVariable Long id) {
        return ResponseEntity.ok(cameraService.getCameraById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new camera (ADMIN only)")
    public ResponseEntity<CameraResponse> createCamera(@Valid @RequestBody CameraRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cameraService.createCamera(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a camera (ADMIN only)")
    public ResponseEntity<CameraResponse> updateCamera(@PathVariable Long id,
                                                       @Valid @RequestBody CameraRequest request) {
        return ResponseEntity.ok(cameraService.updateCamera(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a camera (ADMIN only)")
    public ResponseEntity<Void> deleteCamera(@PathVariable Long id) {
        cameraService.deleteCamera(id);
        return ResponseEntity.noContent().build();
    }
}
