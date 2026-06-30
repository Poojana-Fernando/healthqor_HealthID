package com.healthid.dto.doctorportal;

import com.healthid.entity.AppointmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class DoctorAppointmentResponse {
    private String id;
    private String referenceNumber;
    private String patientId;
    private String patientName;
    private String patientHealthId;
    private Instant scheduledAt;
    private AppointmentStatus status;
    private String notes;
    private DoctorPatientHealthSummary healthSummary;
    private Instant createdAt;
}
