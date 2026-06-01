package com.firesafe.backend.repositories;

import com.firesafe.backend.models.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    Page<Alert> findAllByOrderByDetectedAtDesc(Pageable pageable);
    Page<Alert> findByCameraIdOrderByDetectedAtDesc(Long cameraId, Pageable pageable);
    long countByStatus(String status);
    long countByDetectedAtAfter(LocalDateTime detectedAt);
    long countByDetectedAtAfterAndConfidenceGreaterThanEqual(LocalDateTime detectedAt, BigDecimal confidence);
}
