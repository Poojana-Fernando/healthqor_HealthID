package com.healthid.dto.doctorportal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class DoctorScheduleRequest {

    @NotEmpty
    @Valid
    private List<DayScheduleDto> days;

    @Min(15)
    @Max(120)
    private int slotDurationMinutes = 30;
}
