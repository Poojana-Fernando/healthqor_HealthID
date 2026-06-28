package com.healthid.service.email;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@Component
public class CapturedEmailStore {

    private final AtomicReference<VerificationEmailPayload> lastEmail = new AtomicReference<>();
    private final AtomicReference<PasswordResetEmailPayload> lastPasswordResetEmail = new AtomicReference<>();
    private final AtomicReference<DoctorInvitationEmailPayload> lastDoctorInvitationEmail = new AtomicReference<>();

    public void capture(VerificationEmailPayload payload) {
        lastEmail.set(payload);
    }

    public VerificationEmailPayload getLast() {
        return lastEmail.get();
    }

    public void capturePasswordReset(PasswordResetEmailPayload payload) {
        lastPasswordResetEmail.set(payload);
    }

    public PasswordResetEmailPayload getLastPasswordReset() {
        return lastPasswordResetEmail.get();
    }

    public void captureDoctorInvitation(DoctorInvitationEmailPayload payload) {
        lastDoctorInvitationEmail.set(payload);
    }

    public DoctorInvitationEmailPayload getLastDoctorInvitation() {
        return lastDoctorInvitationEmail.get();
    }

    public void clear() {
        lastEmail.set(null);
        lastPasswordResetEmail.set(null);
        lastDoctorInvitationEmail.set(null);
    }
}
