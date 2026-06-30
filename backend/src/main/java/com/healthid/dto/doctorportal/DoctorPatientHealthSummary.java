package com.healthid.dto.doctorportal;

import com.healthid.entity.Gender;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class DoctorPatientHealthSummary {
    private Gender gender;
    private String bloodType;
    private BigDecimal bmi;
    private LocalDate birthDate;
    private String allergies;
}
