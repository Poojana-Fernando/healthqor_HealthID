package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.UUID;

@Document(collection = "vaccinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vaccination {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String vaccineName;

    @Builder.Default
    private int doseNumber = 1;

    private LocalDate dateAdministered;

    private LocalDate nextDueDate;

    private String administeredBy;

    private String certificateUrl;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }
}
