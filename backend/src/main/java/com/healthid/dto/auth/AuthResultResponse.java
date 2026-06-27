package com.healthid.dto.auth;

import com.healthid.entity.Role;
import com.healthid.entity.VerificationPurpose;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AuthResultResponse {

    private boolean requiresVerification;

    private String userId;
    private String name;
    private String email;
    private String healthId;
    private Role role;
    private String profileImageUrl;

    private String challengeId;
    private String maskedEmail;
    private Instant expiresAt;
    private VerificationPurpose purpose;

    public static AuthResultResponse fromAuth(AuthResponse auth) {
        return AuthResultResponse.builder()
                .requiresVerification(false)
                .userId(auth.getUserId())
                .name(auth.getName())
                .email(auth.getEmail())
                .healthId(auth.getHealthId())
                .role(auth.getRole())
                .profileImageUrl(auth.getProfileImageUrl())
                .build();
    }

    public static AuthResultResponse verificationRequired(
            String challengeId,
            String maskedEmail,
            Instant expiresAt,
            VerificationPurpose purpose) {
        return AuthResultResponse.builder()
                .requiresVerification(true)
                .challengeId(challengeId)
                .maskedEmail(maskedEmail)
                .expiresAt(expiresAt)
                .purpose(purpose)
                .build();
    }
}
