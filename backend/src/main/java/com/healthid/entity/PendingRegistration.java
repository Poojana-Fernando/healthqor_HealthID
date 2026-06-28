package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Document(collection = "pending_registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingRegistration {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String name;

    private String passwordHash;

    private String mobile;

    private String country;

    private byte[] nationalId;

    private String healthId;

    private Gender gender;

    private String bloodType;

    private BigDecimal heightCm;

    private BigDecimal weightKg;

    private LocalDate birthDate;

    private byte[] allergies;

    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    private Instant createdAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
