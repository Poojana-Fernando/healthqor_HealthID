package com.healthid.dto.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemStatsResponse {

    private long totalUsers;
    private long totalDoctors;
    private long appointmentsToday;
    private long totalAuditLogs;
}
