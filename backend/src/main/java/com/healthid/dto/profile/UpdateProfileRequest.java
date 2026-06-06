package com.healthid.dto.profile;

import com.healthid.entity.Gender;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateProfileRequest {

    private String name;
    private String mobile;
    private Gender gender;
    private String bloodType;
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private LocalDate birthDate;
    private String eyesightLeft;
    private String eyesightRight;
    private List<String> allergies;
}
