package com.healthid.dto.doctorportal;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Data
public class DayScheduleDto {

    @NotNull
    private DayOfWeek dayOfWeek;

    private boolean enabled;

    private LocalTime startTime;

    private LocalTime endTime;
}
