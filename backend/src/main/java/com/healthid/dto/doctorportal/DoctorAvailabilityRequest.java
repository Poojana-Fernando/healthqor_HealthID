package com.healthid.dto.doctorportal;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DoctorAvailabilityRequest {
    @NotNull
private Boolean available;
}
