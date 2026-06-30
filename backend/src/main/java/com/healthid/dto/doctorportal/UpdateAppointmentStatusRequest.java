package com.healthid.dto.doctorportal;

import com.healthid.entity.AppointmentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateAppointmentStatusRequest {

    @NotNull
    private AppointmentStatus status;
}
