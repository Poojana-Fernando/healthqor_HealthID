package com.healthid.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "vaccinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vaccination {

    @Id
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "vaccine_name", nullable = false)
    private String vaccineName;

    @Column(name = "dose_number", nullable = false)
    @Builder.Default
    private int doseNumber = 1;

    @Column(name = "date_administered", nullable = false)
    private LocalDate dateAdministered;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "administered_by")
    private String administeredBy;

    @Column(name = "certificate_url")
    private String certificateUrl;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }
}
