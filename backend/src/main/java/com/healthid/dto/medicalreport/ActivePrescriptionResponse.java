package com.healthid.dto.medicalreport;

import com.healthid.entity.PrescriptionItem;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class ActivePrescriptionResponse {

    private String reportId;
    private String doctorName;
    private Instant visitDate;
    private PrescriptionItem prescription;
    private LocalDate expiresOn;
    private boolean active;
}
