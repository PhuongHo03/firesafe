package com.firesafe.backend.service;

import com.firesafe.backend.dto.CameraRequest;
import com.firesafe.backend.dto.CameraResponse;
import com.firesafe.backend.entity.Camera;
import com.firesafe.backend.repository.CameraRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CameraService {

    private final CameraRepository cameraRepository;

    @Transactional(readOnly = true)
    public List<CameraResponse> getAllCameras() {
        return cameraRepository.findAll().stream()
                .map(CameraResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public CameraResponse getCameraById(Long id) {
        return cameraRepository.findById(id)
                .map(CameraResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("Camera not found: " + id));
    }

    @Transactional
    public CameraResponse createCamera(CameraRequest request) {
        Camera camera = new Camera();
        camera.setName(request.getName());
        camera.setRtspUrl(request.getRtspUrl());
        camera.setLocation(request.getLocation());
        camera.setActive(request.isActive());
        return CameraResponse.from(cameraRepository.save(camera));
    }

    @Transactional
    public CameraResponse updateCamera(Long id, CameraRequest request) {
        Camera camera = cameraRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Camera not found: " + id));
        camera.setName(request.getName());
        camera.setRtspUrl(request.getRtspUrl());
        camera.setLocation(request.getLocation());
        camera.setActive(request.isActive());
        return CameraResponse.from(cameraRepository.save(camera));
    }

    @Transactional
    public void deleteCamera(Long id) {
        if (!cameraRepository.existsById(id)) {
            throw new EntityNotFoundException("Camera not found: " + id);
        }
        cameraRepository.deleteById(id);
    }
}
