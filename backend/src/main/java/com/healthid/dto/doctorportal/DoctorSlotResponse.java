package com.healthid.dto.doctorportal;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class DoctorSlotResponse {
    private Instant scheduledAt;
}
