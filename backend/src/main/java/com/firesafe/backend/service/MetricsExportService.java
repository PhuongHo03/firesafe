package com.firesafe.backend.service;

import com.firesafe.backend.dto.MetricsExportResponse;
import com.firesafe.backend.entity.Alert;
import com.firesafe.backend.repository.AlertRepository;
import com.firesafe.backend.repository.CameraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MetricsExportService {

    private static final DateTimeFormatter HOUR_FORMAT = DateTimeFormatter.ofPattern("HH:00");

    private final AlertRepository alertRepository;
    private final CameraRepository cameraRepository;

    @Transactional(readOnly = true)
    public MetricsExportResponse export() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);
        List<Alert> alerts = alertRepository.findAll();
        List<Alert> recentAlerts = alerts.stream()
                .filter(alert -> !alert.getDetectedAt().isBefore(last24h))
                .toList();

        List<MetricsExportResponse.LabelCount> byLabel = alerts.stream()
                .collect(Collectors.groupingBy(Alert::getLabel, Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new MetricsExportResponse.LabelCount(entry.getKey(), entry.getValue()))
                .toList();

        Map<String, Long> hourly = new TreeMap<>();
        for (int i = 23; i >= 0; i--) {
            hourly.put(now.minusHours(i).format(HOUR_FORMAT), 0L);
        }
        recentAlerts.forEach(alert -> hourly.computeIfPresent(alert.getDetectedAt().format(HOUR_FORMAT), (hour, count) -> count + 1));

        return new MetricsExportResponse(
                now,
                new MetricsExportResponse.AlertMetrics(
                        alerts.size(),
                        alertRepository.countByStatus("NEW"),
                        recentAlerts.size(),
                        recentAlerts.stream().filter(alert -> alert.getConfidence().compareTo(new BigDecimal("0.9000")) >= 0).count(),
                        byLabel,
                        hourly.entrySet().stream()
                                .map(entry -> new MetricsExportResponse.HourlyCount(entry.getKey(), entry.getValue()))
                                .toList()
                ),
                new MetricsExportResponse.CameraMetrics(
                        cameraRepository.count(),
                        cameraRepository.countByIsActiveTrue()
                )
        );
    }
}
