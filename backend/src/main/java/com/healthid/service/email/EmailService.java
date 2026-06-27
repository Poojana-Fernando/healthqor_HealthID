package com.healthid.service.email;

public interface EmailService {

    void sendVerificationEmail(VerificationEmailPayload payload);
}
