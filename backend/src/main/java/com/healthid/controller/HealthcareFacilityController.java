package com.healthid.controller;

import com.healthid.dto.healthcare.FacilitySearchRequest;
import com.healthid.dto.healthcare.FacilitySearchResponse;
import com.healthid.service.HealthcareFacilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/healthcare")
@Tag(name = "Healthcare Facilities")
public class HealthcareFacilityController {

    private final HealthcareFacilityService healthcareFacilityService;

    public HealthcareFacilityController(HealthcareFacilityService healthcareFacilityService) {
        this.healthcareFacilityService = healthcareFacilityService;
    }

    @PostMapping("/facilities/search")
    @Operation(summary = "Find and rank nearby healthcare facilities by medical condition")
    public ResponseEntity<FacilitySearchResponse> searchFacilities(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody FacilitySearchRequest request) {
        return ResponseEntity.ok(healthcareFacilityService.search(email, request));
    }
}
