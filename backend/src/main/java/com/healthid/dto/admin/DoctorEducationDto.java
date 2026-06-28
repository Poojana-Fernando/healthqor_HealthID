package com.healthid.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DoctorEducationDto {

    @NotBlank
    private String degree;

    @NotBlank
    private String institution;

    @NotNull
    private Integer year;
}
