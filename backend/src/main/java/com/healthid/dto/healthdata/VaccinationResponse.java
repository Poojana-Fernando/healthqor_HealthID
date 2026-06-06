package com.healthid.dto.healthdata;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class VaccinationResponse {

    private String id;
    private String vaccineName;
    private int doseNumber;
    private LocalDate dateAdministered;
    private LocalDate nextDueDate;
    private String administeredBy;
    private String certificateUrl;
}
