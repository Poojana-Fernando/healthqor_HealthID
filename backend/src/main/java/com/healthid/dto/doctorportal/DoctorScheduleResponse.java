package com.healthid.dto.doctorportal;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class DoctorScheduleResponse {
    private String doctorId;
    private List<DayScheduleDto> days;
    private int slotDurationMinutes;
    private Instant updatedAt;
}
