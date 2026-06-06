package com.healthid.dto.admin;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AuditLogResponse {

    private String id;
    private String userId;
    private String action;
    private String entityType;
    private String entityId;
    private String ipAddress;
    private Instant timestamp;
}
