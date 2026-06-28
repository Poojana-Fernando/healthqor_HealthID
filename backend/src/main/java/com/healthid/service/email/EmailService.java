package com.healthid.service.email;

public interface EmailService {

    void sendVerificationEmail(VerificationEmailPayload payload);

    void sendPasswordResetEmail(PasswordResetEmailPayload payload);

    void sendDoctorInvitationEmail(DoctorInvitationEmailPayload payload);
}
