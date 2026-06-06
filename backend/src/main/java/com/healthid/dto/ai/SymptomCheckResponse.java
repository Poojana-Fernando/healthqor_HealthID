package com.healthid.dto.ai;

import com.healthid.dto.doctor.DoctorResponse;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SymptomCheckResponse {

    private String recommendedSpecialty;
    private String urgencyLevel;
    private String disclaimer;
    private List<String> whatNotToDo;
    private List<RecommendedArticle> recommendedArticles;
    private List<DoctorResponse> nearbyDoctors;
}
