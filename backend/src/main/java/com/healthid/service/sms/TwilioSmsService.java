package com.healthid.service.sms;

import com.healthid.exception.BadRequestException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class TwilioSmsService implements SmsService {

    private final RestTemplate restTemplate;
    private final String accountSid;
    private final String authToken;
    private final String fromNumber;

    public TwilioSmsService(String accountSid, String authToken, String fromNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
        this.restTemplate = createRestTemplate();
    }

    @Override
    public void sendPhoneOtp(SmsOtpPayload payload) {
        validateConfig();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        String credentials = accountSid + ":" + authToken;
        headers.set("Authorization", "Basic " + Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8)));

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("To", payload.toMobile());
        body.add("From", fromNumber);
        body.add("Body", "Your Health ID verification code is: " + payload.otpCode()
                + ". It expires in " + payload.expiryMinutes() + " minutes.");

        try {
            restTemplate.postForEntity(
                    "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json",
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (HttpStatusCodeException e) {
            throw new BadRequestException("Failed to send SMS. Check Twilio configuration and trial restrictions.");
        } catch (ResourceAccessException e) {
            throw new BadRequestException("Failed to reach Twilio. Check your internet connection and try again.");
        }
    }

    private void validateConfig() {
        if (accountSid == null || accountSid.isBlank()) {
            throw new BadRequestException("Twilio account SID is not configured");
        }
        if (authToken == null || authToken.isBlank()) {
            throw new BadRequestException("Twilio auth token is not configured");
        }
        if (fromNumber == null || fromNumber.isBlank()) {
            throw new BadRequestException("Twilio from number is not configured");
        }
    }

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        return new RestTemplate(factory);
    }
}
