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

    @Override
    public void sendAppointmentConfirmationEmail(AppointmentConfirmationEmailPayload payload) {
        sendTransactionalEmail(
                payload.toEmail(),
                "Booking confirmed — Ref " + payload.referenceNumber(),
                buildAppointmentConfirmationHtml(payload),
                buildAppointmentConfirmationText(payload)
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

    private String buildAppointmentConfirmationHtml(AppointmentConfirmationEmailPayload payload) {
        String hospitalLine = payload.doctorHospital() != null && !payload.doctorHospital().isBlank()
                ? "<p><strong>Hospital:</strong> " + escapeHtml(payload.doctorHospital()) + "</p>"
                : "";
        String healthIdLine = payload.patientHealthId() != null && !payload.patientHealthId().isBlank()
                ? "<p><strong>Health ID:</strong> " + escapeHtml(payload.patientHealthId()) + "</p>"
                : "";
        return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                  <div style="background:#0ea5e9;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:24px;text-align:center;">
                    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.9;">Booking Reference</p>
                    <p style="margin:8px 0 0;font-size:28px;font-weight:bold;letter-spacing:4px;">%s</p>
                  </div>
                  <h2 style="color:#0f172a;margin-top:0;">Your appointment has been confirmed</h2>
                  <p>Hello %s,</p>
                  <p>Good news — <strong>%s</strong> has approved your e-Channeling booking on Health ID. Please keep this email as your confirmation receipt when you visit the clinic.</p>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0;">
                    <p style="margin:0 0 12px;"><strong>Patient:</strong> %s</p>
                    %s
                    <p style="margin:0 0 12px;"><strong>Doctor:</strong> %s</p>
                    <p style="margin:0 0 12px;"><strong>Specialization:</strong> %s</p>
                    %s
                    <p style="margin:0 0 12px;"><strong>Appointment time:</strong> %s</p>
                    <p style="margin:0;"><strong>Booked on:</strong> %s</p>
                  </div>
                  <p style="color:#475569;font-size:14px;">Present this reference number at reception or to your doctor on the day of your visit. If you need to reschedule, contact the hospital directly or book again through Health ID.</p>
                  <p style="color:#64748b;font-size:13px;margin-top:24px;">Thank you for using Health ID e-Channeling.</p>
                </div>
                """.formatted(
                escapeHtml(payload.referenceNumber()),
                escapeHtml(payload.patientName()),
                escapeHtml(payload.doctorName()),
                escapeHtml(payload.patientName()),
                healthIdLine,
                escapeHtml(payload.doctorName()),
                escapeHtml(nullToEmpty(payload.doctorSpecialization())),
                hospitalLine,
                escapeHtml(payload.scheduledAtFormatted()),
                escapeHtml(payload.bookedAtFormatted())
        );
    }

    private String buildAppointmentConfirmationText(AppointmentConfirmationEmailPayload payload) {
        StringBuilder body = new StringBuilder();
        body.append("BOOKING REFERENCE: ").append(payload.referenceNumber()).append("\n\n");
        body.append("Your appointment has been confirmed\n\n");
        body.append("Hello ").append(payload.patientName()).append(",\n\n");
        body.append(payload.doctorName())
                .append(" has approved your e-Channeling booking on Health ID.\n");
        body.append("Please keep this email as your confirmation receipt.\n\n");
        body.append("Patient: ").append(payload.patientName()).append("\n");
        if (payload.patientHealthId() != null && !payload.patientHealthId().isBlank()) {
            body.append("Health ID: ").append(payload.patientHealthId()).append("\n");
        }
        body.append("Doctor: ").append(payload.doctorName()).append("\n");
        body.append("Specialization: ").append(nullToEmpty(payload.doctorSpecialization())).append("\n");
        if (payload.doctorHospital() != null && !payload.doctorHospital().isBlank()) {
            body.append("Hospital: ").append(payload.doctorHospital()).append("\n");
        }
        body.append("Appointment time: ").append(payload.scheduledAtFormatted()).append("\n");
        body.append("Booked on: ").append(payload.bookedAtFormatted()).append("\n\n");
        body.append("Present this reference number at reception on the day of your visit.\n");
        return body.toString();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
