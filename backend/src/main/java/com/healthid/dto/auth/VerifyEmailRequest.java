package com.healthid.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyEmailRequest {

    @NotBlank
    private String challengeId;

    private String code;

    private String token;
}
