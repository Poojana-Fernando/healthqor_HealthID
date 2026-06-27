package com.healthid.service.email;

public record VerificationEmailPayload(
        String toEmail,
        String otpCode,
        String magicLinkUrl,
        int expiryMinutes,
        String purposeLabel
) {}
