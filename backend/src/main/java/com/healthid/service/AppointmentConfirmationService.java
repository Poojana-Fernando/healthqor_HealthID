package com.healthid.service;

import com.healthid.entity.Appointment;
import com.healthid.entity.Doctor;
import com.healthid.entity.NameTitle;
import com.healthid.entity.User;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.UserRepository;
import com.healthid.service.email.AppointmentConfirmationEmailPayload;
import com.healthid.service.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class AppointmentConfirmationService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentConfirmationService.class);
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Colombo");
    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter
            .ofPattern("EEEE, d MMMM yyyy 'at' h:mm a", Locale.ENGLISH)
            .withZone(DISPLAY_ZONE);

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;

    public AppointmentConfirmationService(
            UserRepository userRepository,
            EmailService emailService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }

    public void sendDoctorConfirmationReceipt(Appointment appointment, Doctor doctor) {
        User patient = userRepository.findById(appointment.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        User doctorUser = userRepository.findById(doctor.getUserId()).orElse(null);

        String doctorName = formatDoctorName(doctor, doctorUser);
        String referenceNumber = appointment.getId().substring(0, 8).toUpperCase();

        AppointmentConfirmationEmailPayload payload = new AppointmentConfirmationEmailPayload(
                patient.getEmail(),
                patient.getName(),
                patient.getHealthId(),
                doctorName,
                doctor.getSpecialization(),
                doctor.getHospital(),
                referenceNumber,
                formatInstant(appointment.getScheduledAt()),
                formatInstant(appointment.getCreatedAt() != null ? appointment.getCreatedAt() : Instant.now())
        );

        try {
            emailService.sendAppointmentConfirmationEmail(payload);
            auditLogService.log(
                    patient.getId(),
                    "APPOINTMENT_CONFIRMATION_EMAIL_SENT",
                    "Appointment",
                    appointment.getId());
        } catch (Exception e) {
            log.warn("Failed to send appointment confirmation email for appointment {}", appointment.getId(), e);
            auditLogService.log(
                    patient.getId(),
                    "APPOINTMENT_CONFIRMATION_EMAIL_FAILED",
                    "Appointment",
                    appointment.getId());
        }
    }

    private String formatDoctorName(Doctor doctor, User doctorUser) {
        String name = doctorUser != null ? doctorUser.getName() : "Your doctor";
        NameTitle title = doctor.getNameTitle();
        if (title == null) {
            return name;
        }
        return switch (title) {
            case DR -> "Dr. " + name;
            case PROF -> "Prof. " + name;
            case MR -> "Mr. " + name;
            case MRS -> "Mrs. " + name;
            case MISS -> "Miss " + name;
        };
    }

    private String formatInstant(Instant instant) {
        return DISPLAY_FORMAT.format(instant) + " (Sri Lanka Time)";
    }
}
