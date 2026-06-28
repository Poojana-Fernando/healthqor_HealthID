package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    private String mobile;

    private String country;

    private byte[] nationalId;

    @Indexed(unique = true)
    private String healthId;

    @Builder.Default
    private Role role = Role.CITIZEN;

    @Indexed(sparse = true)
    private String googleSub;

    @Indexed(sparse = true)
    private String githubSub;

    private String profileImageUrl;

    @Builder.Default
    private boolean verified = false;

    private Instant emailVerifiedAt;

    @Builder.Default
    private boolean phoneVerified = false;

    private Instant phoneVerifiedAt;

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

    public void touchUpdatedAt() {
        updatedAt = Instant.now();
    }
}
