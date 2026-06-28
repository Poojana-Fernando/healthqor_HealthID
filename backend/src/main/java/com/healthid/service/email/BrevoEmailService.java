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
        sendTransactionalEmail(
                payload.toEmail(),
                "Verify your Health ID email",
                buildHtml(payload),
                buildText(payload)
        );
    }

    @Override
    public void sendPasswordResetEmail(PasswordResetEmailPayload payload) {
        sendTransactionalEmail(
                payload.toEmail(),
                "Reset your Health ID password",
                buildResetHtml(payload),
                buildResetText(payload)
        );
    }

    @Override
    public void sendDoctorInvitationEmail(DoctorInvitationEmailPayload payload) {
        sendTransactionalEmail(
                payload.toEmail(),
                "You've been invited to Health ID as a doctor",
                buildDoctorInviteHtml(payload),
                buildDoctorInviteText(payload)
        );
    }

    private void validateConfig() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("Brevo API key is not configured");
        }
        if (senderEmail == null || senderEmail.isBlank()) {
            throw new BadRequestException("Brevo sender email is not configured");
        }
    }

    private void sendTransactionalEmail(String toEmail, String subject, String html, String text) {
        validateConfig();
        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sender", Map.of("name", senderName, "email", senderEmail));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", subject);
        body.put("htmlContent", html);
        body.put("textContent", text);

        try {
            restTemplate.postForEntity(
                    "https://api.brevo.com/v3/smtp/email",
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (HttpStatusCodeException e) {
            throw new BadRequestException("Failed to send email. Check Brevo configuration.");
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

    private String buildResetHtml(PasswordResetEmailPayload payload) {
        return """
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                  <h2 style="color:#0ea5e9;">Reset Your Password</h2>
                  <p>Use this code to reset your Health ID password:</p>
                  <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">%s</p>
                  <p>Or click the button below:</p>
                  <p><a href="%s" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
                  <p style="color:#666;font-size:13px;">This code and link expire in %d minutes.</p>
                </div>
                """.formatted(payload.otpCode(), payload.magicLinkUrl(), payload.expiryMinutes());
    }

    private String buildResetText(PasswordResetEmailPayload payload) {
        return """
                Reset Your Health ID Password

                Use this code: %s

                Or open this link: %s

                Expires in %d minutes.
                """.formatted(payload.otpCode(), payload.magicLinkUrl(), payload.expiryMinutes());
    }

    private String buildDoctorInviteHtml(DoctorInvitationEmailPayload payload) {
        String greeting = payload.doctorName() != null && !payload.doctorName().isBlank()
                ? "Hello " + payload.doctorName() + ","
                : "Hello,";
        return """
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                  <h2 style="color:#0ea5e9;">Welcome to Health ID</h2>
                  <p>%s</p>
                  <p>Your administrator has created a doctor account for you on the Health ID platform. Click the button below to set your password and activate your account.</p>
                  <p><a href="%s" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Set Your Password</a></p>
                  <p style="color:#666;font-size:13px;">This link expires in %d minutes. If you did not expect this invitation, you can ignore this email.</p>
                </div>
                """.formatted(greeting, payload.magicLinkUrl(), payload.expiryMinutes());
    }

    private String buildDoctorInviteText(DoctorInvitationEmailPayload payload) {
        return """
                Welcome to Health ID

                Your administrator has created a doctor account for you. Set your password by opening this link:

                %s

                This link expires in %d minutes.
                """.formatted(payload.magicLinkUrl(), payload.expiryMinutes());
    }
}
