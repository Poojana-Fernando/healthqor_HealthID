package com.healthid.service.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnMissingBean(EmailService.class)
public class NoOpEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(NoOpEmailService.class);

    private final CapturedEmailStore capturedEmailStore;

    public NoOpEmailService(CapturedEmailStore capturedEmailStore) {
        this.capturedEmailStore = capturedEmailStore;
    }

    @Override
    public void sendVerificationEmail(VerificationEmailPayload payload) {
        capturedEmailStore.capture(payload);
        log.info(
                "DEV email verification for {} ({}): OTP={}, magicLink={}",
                payload.toEmail(),
                payload.purposeLabel(),
                payload.otpCode(),
                payload.magicLinkUrl()
        );
    }
}
