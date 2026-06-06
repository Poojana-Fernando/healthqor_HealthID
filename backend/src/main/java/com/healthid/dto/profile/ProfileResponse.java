package com.healthid.dto.profile;

import com.healthid.entity.Gender;
import com.healthid.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class ProfileResponse {

    private String userId;
    private String name;
    private String email;
    private String healthId;
    private String country;
    private String mobile;
    private String profileImageUrl;
    private Role role;
    private boolean verified;
    private boolean doctorVerified;

    private Gender gender;
    private String bloodType;
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private BigDecimal bmi;
    private LocalDate birthDate;
    private String eyesightLeft;
    private String eyesightRight;
    private List<String> allergies;

    private String aiHealthScore;
    private Instant lastAiAnalysis;
}
