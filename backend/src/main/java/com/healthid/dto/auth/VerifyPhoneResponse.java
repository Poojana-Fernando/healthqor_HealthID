package com.healthid.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerifyPhoneResponse {

    private boolean phoneVerified;
    private String mobile;
}
