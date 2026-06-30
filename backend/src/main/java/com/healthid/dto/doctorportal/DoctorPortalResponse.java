package com.healthid.dto.doctorportal;

import com.healthid.entity.DoctorEducation;
import com.healthid.entity.MaritalStatus;
import com.healthid.entity.NameTitle;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DoctorPortalResponse {
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
}
