package com.healthid.dto.profile;

import com.healthid.entity.Gender;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    private String name;

    @Size(max = 50, message = "Mobile must be at most 50 characters")
    private String mobile;

    private Gender gender;

    @Size(max = 10, message = "Blood type must be at most 10 characters")
    private String bloodType;

    @DecimalMin(value = "0.01", message = "Height must be positive")
    private BigDecimal heightCm;

    @DecimalMin(value = "0.01", message = "Weight must be positive")
    private BigDecimal weightKg;

    @Past(message = "Birth date must be in the past")
    private LocalDate birthDate;

    @Size(max = 20, message = "Eyesight value must be at most 20 characters")
    private String eyesightLeft;

    @Size(max = 20, message = "Eyesight value must be at most 20 characters")
    private String eyesightRight;

    private List<@Size(max = 100, message = "Each allergy must be at most 100 characters") String> allergies;
}
