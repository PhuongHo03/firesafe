package com.firesafe.backend.controllers;

import com.firesafe.backend.dtos.CameraDetectionStatusResponse;
import com.firesafe.backend.models.Camera;
import com.firesafe.backend.repositories.CameraRepository;
import com.firesafe.backend.services.PreviewReservationService;
import com.firesafe.backend.services.WorkerClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/cameras")
@RequiredArgsConstructor
@Tag(name = "Camera Worker", description = "Authenticated AI Worker gateway")
@SecurityRequirement(name = "bearerAuth")
public class CameraWorkerController {

    private final CameraRepository cameraRepository;
    private final WorkerClient workerClient;
    private final PreviewReservationService previewReservationService;

    @PostMapping("/{cameraId}/detection/start")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Start camera detection through backend gateway")
    public ResponseEntity<CameraDetectionStatusResponse> startDetection(@PathVariable Long cameraId) {
        Camera camera = cameraRepository.findById(cameraId)
                .orElseThrow(() -> new EntityNotFoundException("Camera not found: " + cameraId));
        if (!camera.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Camera is inactive");
        }
        return ResponseEntity.ok(workerClient.startCamera(camera.getId(), camera.getRtspUrl()));
    }

    @PostMapping("/{cameraId}/detection/stop")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Stop camera detection through backend gateway")
    public ResponseEntity<CameraDetectionStatusResponse> stopDetection(@PathVariable Long cameraId) {
        ensureCameraExists(cameraId);
        CameraDetectionStatusResponse response = workerClient.stopCamera(cameraId);
        previewReservationService.releaseAllForCamera(cameraId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{cameraId}/detection/status")
    @Operation(summary = "Get camera detection status through backend gateway")
    public ResponseEntity<CameraDetectionStatusResponse> getDetectionStatus(@PathVariable Long cameraId) {
        ensureCameraExists(cameraId);
        return ResponseEntity.ok(workerClient.getCameraStatus(cameraId));
    }

    @GetMapping("/{cameraId}/stream.mjpg")
    @PreAuthorize("hasAnyRole('ADMIN', 'VIEWER')")
    @Operation(summary = "Stream camera MJPEG after authentication and preview reservation checks")
    public ResponseEntity<StreamingResponseBody> streamCamera(@PathVariable Long cameraId, Authentication authentication) {
        ensureCameraExists(cameraId);
        if (!previewReservationService.hasReservation(authentication.getName(), cameraId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Preview reservation is missing or expired");
        }
        StreamingResponseBody body = outputStream -> workerClient.streamCamera(cameraId, outputStream);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("multipart/x-mixed-replace; boundary=frame"))
                .header("Cache-Control", "no-cache")
                .body(body);
    }

    private void ensureCameraExists(Long cameraId) {
        if (!cameraRepository.existsById(cameraId)) {
            throw new EntityNotFoundException("Camera not found: " + cameraId);
        }
    }
}
