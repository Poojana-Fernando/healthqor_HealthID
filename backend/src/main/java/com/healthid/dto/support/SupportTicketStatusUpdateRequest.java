package com.healthid.dto.support;

import com.healthid.entity.SupportTicketStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SupportTicketStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private SupportTicketStatus status;
}
