package com.healthid.dto.admin;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminPatientResponse {

    private String id;
    private String name;
    private String email;
    private String healthId;
    private String mobile;
    private boolean phoneVerified;
    private boolean emailVerified;
    private Instant createdAt;
    private AdminPatientHealthSummary healthSummary;
}
