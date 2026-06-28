package com.healthid.dto.admin;

import com.healthid.entity.Gender;
import com.healthid.entity.MaritalStatus;
import com.healthid.entity.NameTitle;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class AdminCreateDoctorRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String nationalId;

    @NotBlank
    private String country;

    @NotNull
    private LocalDate birthDate;

    @NotNull
    private Gender gender;

    @NotNull
    private NameTitle nameTitle;

    @NotBlank
    private String specialization;

    @NotBlank
    private String hospital;

    @NotBlank
    private String licenseNumber;

    @NotEmpty
    @Valid
    private List<DoctorEducationDto> education;

    @NotNull
    private Integer experienceYears;

    @NotNull
    private MaritalStatus maritalStatus;

    private BigDecimal lat;

    private BigDecimal lng;
}
