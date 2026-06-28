package com.healthid.dto.auth;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SendPhoneOtpResponse {

    private String maskedMobile;
    private Instant expiresAt;
    private String message;
}
