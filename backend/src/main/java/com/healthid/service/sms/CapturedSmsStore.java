package com.healthid.service.sms;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@Component
public class CapturedSmsStore {

    private final AtomicReference<SmsOtpPayload> lastSms = new AtomicReference<>();

    public void capture(SmsOtpPayload payload) {
        lastSms.set(payload);
    }

    public SmsOtpPayload getLast() {
        return lastSms.get();
    }

    public void clear() {
        lastSms.set(null);
    }
}
