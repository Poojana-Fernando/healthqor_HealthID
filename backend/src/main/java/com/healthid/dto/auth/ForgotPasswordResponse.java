package com.healthid.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ForgotPasswordResponse {

    public static final String MESSAGE =
            "If an account with that email exists, we sent password reset instructions.";

    private String message;

    public static ForgotPasswordResponse generic() {
        return ForgotPasswordResponse.builder().message(MESSAGE).build();
    }
}
