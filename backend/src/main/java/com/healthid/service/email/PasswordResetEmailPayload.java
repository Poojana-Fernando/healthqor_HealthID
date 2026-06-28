package com.healthid.service.email;

public record PasswordResetEmailPayload(
        String toEmail,
        String otpCode,
        String magicLinkUrl,
        int expiryMinutes
) {}
