package com.healthid.service.sms;

public record SmsOtpPayload(String toMobile, String otpCode, int expiryMinutes) {
}
