package com.healthid.dto.admin;

import com.healthid.entity.MaritalStatus;
import com.healthid.entity.NameTitle;
import jakarta.validation.Valid;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class AdminUpdateDoctorRequest {

    private NameTitle nameTitle;

    private String specialization;

    private String hospital;

    private String licenseNumber;

    @Valid
    private List<DoctorEducationDto> education;

    private Integer experienceYears;

    private MaritalStatus maritalStatus;

    private Boolean available;

    private BigDecimal lat;

    private BigDecimal lng;
}
