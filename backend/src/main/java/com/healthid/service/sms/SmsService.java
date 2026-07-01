package com.healthid.service.sms;

public interface SmsService {

    void sendPhoneOtp(SmsOtpPayload payload);

    default boolean isDevCaptureMode() {
        return false;
    }
}
