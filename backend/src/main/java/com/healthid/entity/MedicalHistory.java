package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.UUID;

@Document(collection = "medical_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalHistory {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String conditionName;

    private LocalDate diagnosedDate;

    private LocalDate resolvedDate;

    private byte[] notes;

    private String documentUrl;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }
}
