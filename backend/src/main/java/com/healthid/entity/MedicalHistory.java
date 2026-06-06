package com.healthid.entity;

import com.healthid.entity.converter.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "medical_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalHistory {

    @Id
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "condition_name", nullable = false)
    private String conditionName;

    @Column(name = "diagnosed_date")
    private LocalDate diagnosedDate;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(columnDefinition = "VARBINARY(2048)")
    private String notes;

    @Column(name = "document_url")
    private String documentUrl;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }
}
