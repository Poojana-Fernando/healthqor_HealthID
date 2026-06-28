package com.healthid.dto.admin;

import com.healthid.entity.DoctorEducation;
import com.healthid.entity.MaritalStatus;
import com.healthid.entity.NameTitle;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class AdminDoctorResponse {

    private String id;
    private String userId;
    private String name;
    private String email;
    private String healthId;
    private NameTitle nameTitle;
    private String specialization;
    private String hospital;
    private String licenseNumber;
    private List<DoctorEducation> education;
    private Integer experienceYears;
    private MaritalStatus maritalStatus;
    private boolean verifiedByAdmin;
    private boolean available;
    private BigDecimal avgRating;
    private BigDecimal lat;
    private BigDecimal lng;
    private long bookingCount;
    private Instant createdAt;
    private Instant deactivatedAt;
}
