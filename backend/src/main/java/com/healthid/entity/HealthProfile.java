package com.healthid.entity;

import com.healthid.entity.converter.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "health_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthProfile {

    @Id
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", nullable = false, unique = true, columnDefinition = "CHAR(36)")
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Builder.Default
    private Gender gender = Gender.MALE;

    @Column(name = "blood_type", length = 10)
    private String bloodType;

    @Column(name = "height_cm", precision = 5, scale = 2)
    private BigDecimal heightCm;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(precision = 5, scale = 2)
    private BigDecimal bmi;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "eyesight_left", length = 20)
    private String eyesightLeft;

    @Column(name = "eyesight_right", length = 20)
    private String eyesightRight;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(columnDefinition = "VARBINARY(2048)")
    private String allergies;

    @Column(name = "doctor_verified", nullable = false)
    @Builder.Default
    private boolean doctorVerified = false;

    @Column(name = "ai_health_score", columnDefinition = "TEXT")
    private String aiHealthScore;

    @Column(name = "last_ai_analysis")
    private Instant lastAiAnalysis;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }
}
