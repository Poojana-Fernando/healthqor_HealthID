package com.healthid.config;

import com.healthid.service.sms.CapturedSmsStore;
import com.healthid.service.sms.NoOpSmsService;
import com.healthid.service.sms.SmsService;
import com.healthid.service.sms.TwilioSmsService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class PhoneSmsConfigurationTest {

    @Test
    void usesNoopWhenTwilioCredentialsMissing() {
        MockEnvironment environment = new MockEnvironment();
        PhoneSmsConfiguration configuration = new PhoneSmsConfiguration();

        SmsService smsService = configuration.smsService(environment, new CapturedSmsStore());

        assertThat(smsService).isInstanceOf(NoOpSmsService.class);
        assertThat(smsService.isDevCaptureMode()).isTrue();
    }

    @Test
    void usesNoopWhenOnlyAccountSidPresent() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("twilio.account-sid", "ACtest123");

        PhoneSmsConfiguration configuration = new PhoneSmsConfiguration();

        SmsService smsService = configuration.smsService(environment, new CapturedSmsStore());

        assertThat(smsService).isInstanceOf(NoOpSmsService.class);
    }

    @Test
    void usesTwilioWhenAllCredentialsPresent() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("twilio.account-sid", "ACtest123")
                .withProperty("twilio.auth-token", "token")
                .withProperty("twilio.from-number", "+15005550006");

        PhoneSmsConfiguration configuration = new PhoneSmsConfiguration();

        SmsService smsService = configuration.smsService(environment, new CapturedSmsStore());

        assertThat(smsService).isInstanceOf(TwilioSmsService.class);
        assertThat(smsService.isDevCaptureMode()).isFalse();
    }

    @Test
    void explicitNoopOverridesTwilioCredentials() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("phone.sms.provider", "noop")
                .withProperty("twilio.account-sid", "ACtest123")
                .withProperty("twilio.auth-token", "token")
                .withProperty("twilio.from-number", "+15005550006");

        PhoneSmsConfiguration configuration = new PhoneSmsConfiguration();

        SmsService smsService = configuration.smsService(environment, new CapturedSmsStore());

        assertThat(smsService).isInstanceOf(NoOpSmsService.class);
    }
}
