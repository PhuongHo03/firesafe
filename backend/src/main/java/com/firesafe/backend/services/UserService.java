package com.firesafe.backend.services;

import com.firesafe.backend.dtos.UpdateUserRequest;
import com.firesafe.backend.dtos.UserResponse;
import com.firesafe.backend.models.Role;
import com.firesafe.backend.models.User;
import com.firesafe.backend.repositories.RoleRepository;
import com.firesafe.backend.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final Set<String> ALLOWED_ROLES = Set.of("ROLE_ADMIN", "ROLE_VIEWER");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, String currentEmail) {
        if (!ALLOWED_ROLES.contains(request.getRole())) {
            throw new IllegalArgumentException("Role must be ROLE_ADMIN or ROLE_VIEWER");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        if (user.getEmail().equals(currentEmail)) {
            throw new IllegalArgumentException("Không thể tự inactive hoặc chỉnh role tài khoản của chính mình");
        }
        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + request.getRole()));
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }
        user.getRoles().clear();
        user.getRoles().add(role);
        return UserResponse.from(userRepository.save(user));
    }
}
