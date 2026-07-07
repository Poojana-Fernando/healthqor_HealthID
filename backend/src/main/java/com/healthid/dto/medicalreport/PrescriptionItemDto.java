package com.healthid.dto.medicalreport;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PrescriptionItemDto {

    @NotBlank
    private String medicationName;

    private String dosage;
    private String frequency;
    private Integer durationDays;
}
