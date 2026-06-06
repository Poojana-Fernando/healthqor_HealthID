package com.healthid.entity;

import com.healthid.entity.converter.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "patient_id", nullable = false, columnDefinition = "CHAR(36)")
    private String patientId;

    @Column(name = "doctor_id", nullable = false, columnDefinition = "CHAR(36)")
    private String doctorId;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(columnDefinition = "VARBINARY(1024)")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
