package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "email_verification_challenges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationChallenge {

    @Id
    private String id;

    @Indexed
    private String email;

    private VerificationPurpose purpose;

    private String otpHash;

    private String magicTokenHash;

    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    @Builder.Default
    private int attempts = 0;

    @Builder.Default
    private int maxAttempts = 5;

    private Instant consumedAt;

    private String pendingRegistrationId;

    private String userId;

    private Instant createdAt;

    private Instant lastSentAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (lastSentAt == null) {
            lastSentAt = createdAt;
        }
    }
}
