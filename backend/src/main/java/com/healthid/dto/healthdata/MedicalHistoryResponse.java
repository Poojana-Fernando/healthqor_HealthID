package com.healthid.dto.healthdata;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class MedicalHistoryResponse {

    private String id;
    private String conditionName;
    private LocalDate diagnosedDate;
    private LocalDate resolvedDate;
    private String documentUrl;
}
