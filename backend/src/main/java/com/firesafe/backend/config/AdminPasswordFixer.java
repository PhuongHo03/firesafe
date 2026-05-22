package com.firesafe.backend.config;

import com.firesafe.backend.entity.User;
import com.firesafe.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminPasswordFixer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        userRepository.findByUsername("admin").ifPresent(admin -> {
            String newHash = passwordEncoder.encode("admin123");
            admin.setPasswordHash(newHash);
            userRepository.save(admin);
            log.info("🔥 FIXED ADMIN PASSWORD HASH IN DATABASE! New hash: {}", newHash);
        });
    }
}
