package com.healthid.dto.medicalreport;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
public class SubmitPatientReportRequest {

    @NotBlank
    private String diagnosisSummary;

    private String doctorPrivateNotes;

    @Valid
    private List<PrescriptionItemDto> prescriptions = new ArrayList<>();

    private LocalDate followUpDate;
}
