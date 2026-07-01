package com.healthid.dto.profile;

import com.healthid.entity.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Name cannot be blank")
    private String name;

    @NotBlank(message = "Mobile cannot be blank")
    @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Mobile must be E.164 format")
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
