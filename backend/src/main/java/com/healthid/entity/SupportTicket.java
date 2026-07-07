package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicket {

    @Id
    private String id;

    @Indexed(unique = true)
    private String ticketNumber;

    @Indexed
    private String userId;

    private String name;
    private String email;
    private String subject;
    private String category;
    private String priority;
    private String message;

    @Builder.Default
    private SupportTicketStatus status = SupportTicketStatus.RECEIVED;

    private String attachmentFileName;
    private String attachmentContentType;
    private String attachmentGridFsId;

    private Instant createdAt;
    private Instant updatedAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }
}
