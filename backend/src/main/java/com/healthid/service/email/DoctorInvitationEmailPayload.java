package com.healthid.service.email;

public record DoctorInvitationEmailPayload(
        String toEmail,
        String doctorName,
        String magicLinkUrl,
        int expiryMinutes
) {}
