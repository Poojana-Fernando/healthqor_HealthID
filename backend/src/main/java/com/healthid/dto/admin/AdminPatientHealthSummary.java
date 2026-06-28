package com.healthid.dto.admin;

import com.healthid.entity.Gender;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class AdminPatientHealthSummary {

    private Gender gender;
    private String bloodType;
    private BigDecimal bmi;
    private LocalDate birthDate;
}
