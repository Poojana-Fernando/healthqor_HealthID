package com.healthid.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResetPasswordResponse {

    public static final String MESSAGE =
            "Password updated successfully. Please log in with your new password.";

    private String message;

    public static ResetPasswordResponse success() {
        return ResetPasswordResponse.builder().message(MESSAGE).build();
    }
}
