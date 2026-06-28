package com.healthid.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import com.healthid.entity.Gender;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class RegisterRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank
    private String nationalId;

    @NotBlank
    private String country;

    @NotBlank
    @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Mobile must be E.164 format")
    private String mobile;

    private Gender gender;

    @NotBlank
    private String bloodType;

    private BigDecimal heightCm;

    private BigDecimal weightKg;

    @NotNull
    private LocalDate birthDate;

    private List<String> allergies;
}
