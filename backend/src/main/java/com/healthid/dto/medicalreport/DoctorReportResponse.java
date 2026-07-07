package com.healthid.dto.medicalreport;

import com.healthid.entity.PrescriptionItem;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class DoctorReportResponse {

    private String id;
    private String appointmentId;
    private String patientId;
    private String patientName;
    private Instant visitDate;
    private String diagnosisSummary;
    private String doctorPrivateNotes;
    private List<PrescriptionItem> prescriptions;
    private LocalDate followUpDate;
    private Instant createdAt;
}
