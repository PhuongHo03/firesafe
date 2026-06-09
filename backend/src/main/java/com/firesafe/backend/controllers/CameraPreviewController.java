package com.firesafe.backend.controllers;

import com.firesafe.backend.dtos.PreviewReservationResponse;
import com.firesafe.backend.dtos.PreviewReservationsResponse;
import com.firesafe.backend.services.PreviewReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cameras")
@RequiredArgsConstructor
@Tag(name = "Camera Preview", description = "Preview reservation management")
@SecurityRequirement(name = "bearerAuth")
public class CameraPreviewController {

    private final PreviewReservationService previewReservationService;

    @PostMapping("/{cameraId}/preview/reserve")
    @Operation(summary = "Reserve camera preview if system capacity allows it")
    public ResponseEntity<PreviewReservationResponse> reserve(@PathVariable Long cameraId, Authentication authentication) {
        PreviewReservationResponse response = previewReservationService.reserve(authentication.getName(), cameraId);
        return response.isReserved() ? ResponseEntity.ok(response) : ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    @PostMapping("/{cameraId}/preview/keepalive")
    @Operation(summary = "Extend a camera preview reservation")
    public ResponseEntity<PreviewReservationResponse> keepAlive(@PathVariable Long cameraId, Authentication authentication) {
        PreviewReservationResponse response = previewReservationService.keepAlive(authentication.getName(), cameraId);
        return response.isReserved() ? ResponseEntity.ok(response) : ResponseEntity.status(HttpStatus.GONE).body(response);
    }

    @PostMapping("/{cameraId}/preview/release")
    @Operation(summary = "Release a camera preview reservation")
    public ResponseEntity<PreviewReservationResponse> release(@PathVariable Long cameraId, Authentication authentication) {
        return ResponseEntity.ok(previewReservationService.release(authentication.getName(), cameraId));
    }

    @PostMapping("/preview/release-all")
    @Operation(summary = "Release all camera preview reservations for the current user")
    public ResponseEntity<Void> releaseAll(Authentication authentication) {
        previewReservationService.releaseAllForUser(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preview/my")
    @Operation(summary = "List current user's active preview reservations")
    public ResponseEntity<PreviewReservationsResponse> listMine(Authentication authentication) {
        return ResponseEntity.ok(previewReservationService.listMine(authentication.getName()));
    }
}
