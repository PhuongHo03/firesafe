package com.firesafe.backend.services;

import com.firesafe.backend.dtos.UpdateUserRequest;
import com.firesafe.backend.dtos.UserResponse;
import com.firesafe.backend.models.User;
import com.firesafe.backend.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, String currentEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
        if (request.getActive() != null) {
            if (user.getEmail().equals(currentEmail) && !request.getActive()) {
                throw new IllegalArgumentException("Không thể tự vô hiệu hóa tài khoản của chính mình");
            }
            user.setActive(request.getActive());
        }
        return UserResponse.from(userRepository.save(user));
    }
}
