package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Document(collection = "vitals_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VitalsSnapshot {

    @Id
    private String id;

    @Indexed
    private String userId;

    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private BigDecimal bmi;

    @Indexed
    private Instant recordedAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (recordedAt == null) {
            recordedAt = Instant.now();
        }
    }
}
