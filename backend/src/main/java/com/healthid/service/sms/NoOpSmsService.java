package com.healthid.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnMissingBean(SmsService.class)
public class NoOpSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(NoOpSmsService.class);

    private final CapturedSmsStore capturedSmsStore;

    public NoOpSmsService(CapturedSmsStore capturedSmsStore) {
        this.capturedSmsStore = capturedSmsStore;
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
