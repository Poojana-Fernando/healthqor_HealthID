package com.healthid.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DoctorLoginRequest {

    @NotBlank
    private String identifier;

    @NotBlank
    private String password;
}
