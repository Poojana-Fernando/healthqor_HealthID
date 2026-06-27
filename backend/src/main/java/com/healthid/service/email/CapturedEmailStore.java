package com.healthid.service.email;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@Component
public class CapturedEmailStore {

    private final AtomicReference<VerificationEmailPayload> lastEmail = new AtomicReference<>();

    public void capture(VerificationEmailPayload payload) {
        lastEmail.set(payload);
    }

    public VerificationEmailPayload getLast() {
        return lastEmail.get();
    }

    public void clear() {
        lastEmail.set(null);
    }
}
