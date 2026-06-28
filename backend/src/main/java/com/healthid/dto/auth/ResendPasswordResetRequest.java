package com.healthid.dto.auth;

import lombok.Data;

@Data
public class ResendPasswordResetRequest {

    private String challengeId;

    private String email;
}
