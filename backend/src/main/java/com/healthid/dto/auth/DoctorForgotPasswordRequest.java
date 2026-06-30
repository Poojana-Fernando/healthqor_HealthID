package com.healthid.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DoctorForgotPasswordRequest {

    @NotBlank
    private String identifier;
}
