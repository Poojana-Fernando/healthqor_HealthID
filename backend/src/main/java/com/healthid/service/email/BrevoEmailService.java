package com.healthid.service.email;

import com.healthid.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnExpression("!'${brevo.api-key:}'.isBlank()")
public class BrevoEmailService implements EmailService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey;
    private final String senderEmail;
    private final String senderName;

    public BrevoEmailService(
            @Value("${brevo.api-key}") String apiKey,
            @Value("${brevo.sender.email}") String senderEmail,
            @Value("${brevo.sender.name}") String senderName) {
        this.apiKey = apiKey;
        this.senderEmail = senderEmail;
        this.senderName = senderName;
    }

    @Override
    public void sendVerificationEmail(VerificationEmailPayload payload) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("Brevo API key is not configured");
        }
        if (senderEmail == null || senderEmail.isBlank()) {
            throw new BadRequestException("Brevo sender email is not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sender", Map.of("name", senderName, "email", senderEmail));
        body.put("to", List.of(Map.of("email", payload.toEmail())));
        body.put("subject", "Verify your Health ID email");
        body.put("htmlContent", buildHtml(payload));
        body.put("textContent", buildText(payload));

        try {
            restTemplate.postForEntity(
                    "https://api.brevo.com/v3/smtp/email",
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (HttpStatusCodeException e) {
            throw new BadRequestException("Failed to send verification email. Check Brevo configuration.");
        }
    }

    private String buildHtml(VerificationEmailPayload payload) {
        return """
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                  <h2 style="color:#0ea5e9;">Health ID Email Verification</h2>
                  <p>Use this code to %s:</p>
                  <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">%s</p>
                  <p>Or click the button below:</p>
                  <p><a href="%s" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Verify Email</a></p>
                  <p style="color:#666;font-size:13px;">This code and link expire in %d minutes.</p>
                </div>
                """.formatted(
                payload.purposeLabel().toLowerCase(),
                payload.otpCode(),
                payload.magicLinkUrl(),
                payload.expiryMinutes()
        );
    }

    private String buildText(VerificationEmailPayload payload) {
        return """
                Health ID Email Verification

                %s your email using this code: %s

                Or open this link: %s

                Expires in %d minutes.
                """.formatted(
                payload.purposeLabel(),
                payload.otpCode(),
                payload.magicLinkUrl(),
                payload.expiryMinutes()
        );
    }
}
