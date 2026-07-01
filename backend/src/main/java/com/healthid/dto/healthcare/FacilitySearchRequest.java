package com.healthid.dto.healthcare;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FacilitySearchRequest {

    @NotBlank
    private String condition;

    @NotNull
    private BigDecimal lat;

    @NotNull
    private BigDecimal lng;

    private Integer radiusKm;
}
