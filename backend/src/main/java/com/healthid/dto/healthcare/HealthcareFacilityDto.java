package com.healthid.dto.healthcare;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HealthcareFacilityDto {

    private String id;
    private String name;
    private String type;
    private String phone;
    private String address;
    private double lat;
    private double lng;
    private double distanceKm;
    private int rank;
    private String matchReason;
    private boolean largeHospital;
}
