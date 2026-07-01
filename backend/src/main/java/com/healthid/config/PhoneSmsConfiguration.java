package com.healthid.config;

import com.healthid.service.sms.CapturedSmsStore;
import com.healthid.service.sms.NoOpSmsService;
import com.healthid.service.sms.SmsService;
import com.healthid.service.sms.TwilioSmsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class PhoneSmsConfiguration {

    private static final Logger log = LoggerFactory.getLogger(PhoneSmsConfiguration.class);

    @Bean
    public SmsService smsService(Environment environment, CapturedSmsStore capturedSmsStore) {
        String explicitProvider = environment.getProperty("phone.sms.provider", "").trim().toLowerCase();
        String accountSid = environment.getProperty("twilio.account-sid", "").trim();
        String authToken = environment.getProperty("twilio.auth-token", "").trim();
        String fromNumber = environment.getProperty("twilio.from-number", "").trim();

        boolean twilioConfigured = !accountSid.isBlank()
                && !authToken.isBlank()
                && !fromNumber.isBlank();

        String provider = explicitProvider.isBlank()
                ? (twilioConfigured ? "twilio" : "noop")
                : explicitProvider;

        if ("twilio".equals(provider) && !twilioConfigured) {
            log.warn(
                    "phone.sms.provider=twilio but TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and "
                            + "TWILIO_FROM_NUMBER must all be set; using noop dev SMS (OTP logged to console)");
            provider = "noop";
        }

        if (!"twilio".equals(provider) && !"noop".equals(provider)) {
            throw new IllegalStateException(
                    "Unsupported phone.sms.provider '" + provider + "'. Supported values: twilio, noop");
        }

        if ("twilio".equals(provider)) {
            log.info("Phone SMS provider active: twilio");
            return new TwilioSmsService(accountSid, authToken, fromNumber);
        }

        log.info("Phone SMS provider active: noop (OTP codes are logged to the backend console)");
        return new NoOpSmsService(capturedSmsStore);
    }
}
