package com.healthid.dto.ai;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ReportAnalysisResponse {

    private String id;
    private String fileName;
    private String contentType;
    private String aiSummary;
    private Instant createdAt;
}
