package com.healthid.dto.ai;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SymptomCheckRequest {

    @NotEmpty
    private List<String> symptoms;
}
