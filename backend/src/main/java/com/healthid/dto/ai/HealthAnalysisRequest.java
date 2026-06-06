package com.healthid.dto.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class HealthAnalysisRequest {

    @NotBlank
    private String userId;
}
