package com.healthid.dto.ai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class HealthAnalysisResponse {

    private List<String> riskAreas;
    private List<String> positiveIndicators;
    private List<String> lifestyleTips;
    private List<String> nextCheckups;
    private List<String> dietRecommendations;
    private String rawAnalysis;
}
