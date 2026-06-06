package com.healthid.dto.auth;

import com.healthid.entity.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {

    private String userId;
    private String name;
    private String email;
    private String healthId;
    private Role role;
    private String profileImageUrl;
}
