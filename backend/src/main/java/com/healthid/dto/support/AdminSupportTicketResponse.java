package com.healthid.dto.support;

import com.healthid.entity.SupportTicketStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminSupportTicketResponse {

    private String id;
    private String ticketNumber;
    private String userId;
    private String name;
    private String email;
    private String subject;
    private String category;
    private String priority;
    private String message;
    private SupportTicketStatus status;
    private String attachmentFileName;
    private String attachmentContentType;
    private boolean hasAttachment;
    private Instant createdAt;
    private Instant updatedAt;
}
