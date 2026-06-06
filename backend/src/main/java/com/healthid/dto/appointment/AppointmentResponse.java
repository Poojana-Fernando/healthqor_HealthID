package com.healthid.dto.appointment;

import com.healthid.entity.AppointmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AppointmentResponse {

    private String id;
    private String referenceNumber;
    private String doctorId;
    private String doctorName;
    private String specialization;
    private String hospital;
    private Instant scheduledAt;
    private AppointmentStatus status;
    private Instant createdAt;
}
