package com.firesafe.backend.repositories;

import com.firesafe.backend.models.Camera;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CameraRepository extends JpaRepository<Camera, Long> {
    List<Camera> findByIsActiveTrue();
    Optional<Camera> findByRtspUrl(String rtspUrl);
    long countByIsActiveTrue();
}
