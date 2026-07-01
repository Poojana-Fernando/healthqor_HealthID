package com.healthid.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SendPhoneOtpResponse {

    private String maskedMobile;
    private Instant expiresAt;
    private String message;
    private String devOtp;
}
