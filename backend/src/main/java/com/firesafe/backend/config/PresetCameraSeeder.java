package com.firesafe.backend.config;

import com.firesafe.backend.entity.Camera;
import com.firesafe.backend.repository.CameraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class PresetCameraSeeder implements CommandLineRunner {

    private final CameraRepository cameraRepository;

    @Value("${firesafe.preset-camera.rtsp-url:}")
    private String rtspUrl;

    @Value("${firesafe.preset-camera.name:Camera RTSP Preset}")
    private String name;

    @Value("${firesafe.preset-camera.location:Preset}")
    private String location;

    @Override
    @Transactional
    public void run(String... args) {
        if (rtspUrl == null || rtspUrl.isBlank()) {
            return;
        }

        cameraRepository.findByRtspUrl(rtspUrl).orElseGet(() -> {
            Camera camera = new Camera();
            camera.setName(name);
            camera.setLocation(location);
            camera.setRtspUrl(rtspUrl);
            camera.setActive(true);
            return cameraRepository.save(camera);
        });
    }
}
