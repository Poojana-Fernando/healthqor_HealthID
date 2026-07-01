package com.healthid.dto.doctorportal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;


@Data
public class DoctorProfileUpdateRequest {
    @NotBlank
@Size(max = 100)
private String specialization;
    @NotBlank
@Size(max = 100)
private String hospital;
}
