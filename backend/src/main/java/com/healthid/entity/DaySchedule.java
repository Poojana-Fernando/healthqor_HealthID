package com.healthid.entity;

import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DaySchedule {

    private DayOfWeek dayOfWeek;

    @Builder.Default
    private boolean enabled = false;

    private LocalTime startTime;

    private LocalTime endTime;
}
