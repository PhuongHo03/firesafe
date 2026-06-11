package com.firesafe.backend.repositories;

import com.firesafe.backend.models.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    Page<Alert> findAllByOrderByDetectedAtDesc(Pageable pageable);
    Page<Alert> findByCameraIdOrderByDetectedAtDesc(Long cameraId, Pageable pageable);
    List<Alert> findByDetectedAtAfter(LocalDateTime detectedAt);
    List<Alert> findByStatus(String status);
    long countByStatus(String status);
    long countByDetectedAtAfter(LocalDateTime detectedAt);
    long countByDetectedAtAfterAndConfidenceGreaterThanEqual(LocalDateTime detectedAt, BigDecimal confidence);

    @Query("select a.label as label, count(a) as count from Alert a group by a.label order by count(a) desc")
    List<LabelCountProjection> countAlertsByLabel();

    interface LabelCountProjection {
        String getLabel();
        long getCount();
    }
}
