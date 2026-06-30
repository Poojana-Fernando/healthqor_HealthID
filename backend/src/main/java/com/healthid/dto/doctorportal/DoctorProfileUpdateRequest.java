package com.healthid.dto.doctorportal;

import lombok.Data;

@Data
public class DoctorProfileUpdateRequest {
    private String specialization;
    private String hospital;
}
