package com.healthid.dto.support;

import com.healthid.entity.SupportTicketStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SupportTicketResponse {

    private String id;
    private String ticketNumber;
    private String name;
    private String email;
    private String subject;
    private String category;
    private String priority;
    private String message;
    private SupportTicketStatus status;
    private String attachmentFileName;
    private boolean hasAttachment;
    private Instant createdAt;
}
