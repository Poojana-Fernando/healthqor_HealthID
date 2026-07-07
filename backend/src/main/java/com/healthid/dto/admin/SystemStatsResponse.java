package com.healthid.dto.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemStatsResponse {

    private long totalUsers;
    private long totalDoctors;
    private long totalPatients;
    private long appointmentsToday;
    private long cancelledToday;
    private long pendingDoctorVerifications;
    private long totalAuditLogs;
    private long openSupportTickets;
}
