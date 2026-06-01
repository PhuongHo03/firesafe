package com.firesafe.backend.services;

import com.firesafe.backend.dtos.LoginRequest;
import com.firesafe.backend.dtos.LoginResponse;
import com.firesafe.backend.dtos.RegisterRequest;
import com.firesafe.backend.models.Role;
import com.firesafe.backend.models.User;
import com.firesafe.backend.repositories.RoleRepository;
import com.firesafe.backend.repositories.UserRepository;
import com.firesafe.backend.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final String VIEWER_ROLE = "ROLE_VIEWER";
    private static final String ALLOWED_EMAIL_DOMAIN = "@nhattienchung.vn";

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
            throw new IllegalArgumentException("Email phải dùng tên miền @nhattienchung.vn");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Tài khoản không tồn tại"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Tài khoản không tồn tại");
        }
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản chưa được kích hoạt");
        }
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );
        return responseFor(user, (UserDetails) auth.getPrincipal());
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
            throw new IllegalArgumentException("Email phải dùng tên miền @nhattienchung.vn");
        }
        String username = request.getUsername().trim();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên tài khoản đã tồn tại");
        }

        Role viewerRole = roleRepository.findByName(VIEWER_ROLE)
                .orElseThrow(() -> new IllegalStateException("ROLE_VIEWER is missing"));
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive(false);
        user.getRoles().add(viewerRole);
        userRepository.save(user);

        return new LoginResponse(null, user.getUsername(), email, List.of(VIEWER_ROLE));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private LoginResponse responseFor(User user, UserDetails userDetails) {
        String token = jwtUtils.generateToken(userDetails);
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        return new LoginResponse(token, user.getUsername(), user.getEmail(), roles);
    }
}
