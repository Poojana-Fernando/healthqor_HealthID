package com.healthid.dto.doctor;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DoctorResponse {

    private String id;
    private String userId;
    private String name;
    private String specialization;
    private String hospital;
    private BigDecimal lat;
    private BigDecimal lng;
    private BigDecimal avgRating;
    private boolean available;
    private String profileImageUrl;
    private Double distanceKm;
}
