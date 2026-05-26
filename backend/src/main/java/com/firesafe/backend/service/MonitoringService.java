package com.firesafe.backend.service;

import com.firesafe.backend.dto.MonitoringSummaryResponse;
import com.firesafe.backend.repository.AlertRepository;
import com.firesafe.backend.repository.CameraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MonitoringService {

    private final AlertRepository alertRepository;
    private final CameraRepository cameraRepository;

    @Transactional(readOnly = true)
    public MonitoringSummaryResponse getSummary() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);

        return new MonitoringSummaryResponse(
                new MonitoringSummaryResponse.BackendSummary("UP"),
                new MonitoringSummaryResponse.AlertSummary(
                        alertRepository.count(),
                        alertRepository.countByStatus("NEW"),
                        alertRepository.countByDetectedAtAfter(last24h),
                        alertRepository.countByDetectedAtAfterAndConfidenceGreaterThanEqual(last24h, new BigDecimal("0.9000"))
                ),
                new MonitoringSummaryResponse.CameraSummary(
                        cameraRepository.count(),
                        cameraRepository.countByIsActiveTrue()
                ),
                now
        );
    }
}
