package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "phone_verification_challenges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneVerificationChallenge {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String mobile;

    private String otpHash;

    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    @Builder.Default
    private int attempts = 0;

    @Builder.Default
    private int maxAttempts = 5;

    private Instant consumedAt;

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
