package com.healthid.dto.doctorportal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DoctorDashboardStatsResponse {
    private long pendingToday;
    private long confirmedToday;
    private long completedToday;
    private long totalPending;
    private boolean available;
    private boolean verifiedByAdmin;
}
