package com.healthid.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NoOpSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(NoOpSmsService.class);

    private final CapturedSmsStore capturedSmsStore;

    public NoOpSmsService(CapturedSmsStore capturedSmsStore) {
        this.capturedSmsStore = capturedSmsStore;
    }

    @Override
    public boolean isDevCaptureMode() {
        return true;
    }

    @Override
    public void sendPhoneOtp(SmsOtpPayload payload) {
        capturedSmsStore.capture(payload);
        log.info(
                "DEV phone verification SMS to {}: OTP={} (expires in {} minutes)",
                payload.toMobile(),
                payload.otpCode(),
                payload.expiryMinutes()
        );
    }
}
