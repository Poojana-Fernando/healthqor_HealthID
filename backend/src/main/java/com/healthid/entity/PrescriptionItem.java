package com.healthid.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItem {

    private String medicationName;
    private String dosage;
    private String frequency;
    private Integer durationDays;
}
