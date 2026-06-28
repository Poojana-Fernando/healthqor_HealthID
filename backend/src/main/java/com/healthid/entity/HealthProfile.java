package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Document(collection = "health_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthProfile {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default
    private Gender gender = Gender.MALE;

    private String bloodType;

    private BigDecimal heightCm;

    private BigDecimal weightKg;

    private BigDecimal bmi;

    private LocalDate birthDate;

    private String eyesightLeft;

    private String eyesightRight;

    private byte[] allergies;

    @Builder.Default
    private boolean doctorVerified = false;

    private String aiHealthScore;

    private Instant lastAiAnalysis;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }
}
