package com.healthid.dto.appointment;

import jakarta.validation.constraints.Future;
import lombok.Data;

import java.time.Instant;

@Data
public class AppointmentUpdateRequest {

    @Future(message = "Scheduled time must be in the future")
    private Instant scheduledAt;

    private String notes;
}
