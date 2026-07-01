package com.healthid.dto.healthcare;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FacilitySearchResponse {

    private String disclaimer;
    private String recommendedFacilityId;
    private List<HealthcareFacilityDto> facilities;
}
