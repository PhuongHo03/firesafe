package com.firesafe.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateUserRequest {
    private Boolean active;

    @NotBlank(message = "Role is required")
    private String role;
}
