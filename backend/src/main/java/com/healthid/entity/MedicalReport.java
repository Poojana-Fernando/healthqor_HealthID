package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Document(collection = "medical_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalReport {

    @Id
    private String id;

    @Indexed(unique = true)
    private String appointmentId;

    @Indexed
    private String patientId;

    @Indexed
    private String doctorId;

    private byte[] diagnosisSummary;

    private byte[] doctorPrivateNotes;

    @Builder.Default
    private List<PrescriptionItem> prescriptions = new ArrayList<>();

    private LocalDate followUpDate;

    private Instant visitDate;

    private Instant createdAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (prescriptions == null) {
            prescriptions = new ArrayList<>();
        }
    }
}
