package com.healthid.service.email;

public record AppointmentConfirmationEmailPayload(
        String toEmail,
        String patientName,
        String patientHealthId,
        String doctorName,
        String doctorSpecialization,
        String doctorHospital,
        String referenceNumber,
        String scheduledAtFormatted,
        String bookedAtFormatted
) {}
