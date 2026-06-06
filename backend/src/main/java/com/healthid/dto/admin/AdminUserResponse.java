package com.healthid.dto.admin;

import com.healthid.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminUserResponse {

    private String id;
    private String name;
    private String email;
    private String healthId;
    private Role role;
    private boolean verified;
    private Instant createdAt;
}
