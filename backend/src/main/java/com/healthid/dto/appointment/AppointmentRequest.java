package com.healthid.dto.appointment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class AppointmentRequest {

    @NotBlank
    private String doctorId;

    @NotNull
    private Instant scheduledAt;

    private String notes;
}
