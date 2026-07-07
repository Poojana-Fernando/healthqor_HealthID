package com.healthid.dto.healthdata;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class VitalsSnapshotResponse {

    private String id;
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private BigDecimal bmi;
    private Instant recordedAt;
}
