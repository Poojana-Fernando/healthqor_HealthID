package com.healthid.dto.healthdata;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class VaccinationRequest {

    @NotBlank
    private String userId;

    @NotBlank
    private String vaccineName;

    private int doseNumber = 1;

    @NotNull
    private LocalDate dateAdministered;

    private LocalDate nextDueDate;

    private String administeredBy;

    private String certificateUrl;
}
