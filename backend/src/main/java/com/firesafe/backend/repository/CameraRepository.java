package com.firesafe.backend.repository;

import com.firesafe.backend.entity.Camera;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CameraRepository extends JpaRepository<Camera, Long> {
    List<Camera> findByIsActiveTrue();
    Optional<Camera> findByRtspUrl(String rtspUrl);
}
