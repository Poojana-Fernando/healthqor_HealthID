package com.healthid.controller;

import com.healthid.dto.healthdata.MedicalHistoryResponse;
import com.healthid.dto.healthdata.VaccinationRequest;
import com.healthid.dto.healthdata.VaccinationResponse;
import com.healthid.service.HealthDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/health-data")
@Tag(name = "Health Data")
public class HealthDataController {

    private final HealthDataService healthDataService;

    public HealthDataController(HealthDataService healthDataService) {
        this.healthDataService = healthDataService;
    }

    @GetMapping("/vaccinations")
    @Operation(summary = "List own vaccinations")
    public ResponseEntity<List<VaccinationResponse>> getVaccinations(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(healthDataService.getVaccinations(email));
    }

    @PostMapping("/vaccinations")
    @Operation(summary = "Add vaccination (DOCTOR/ADMIN only)")
    public ResponseEntity<VaccinationResponse> addVaccination(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody VaccinationRequest request) {
        return ResponseEntity.ok(healthDataService.addVaccination(email, request));
    }

    @GetMapping("/medical-history")
    @Operation(summary = "List own medical history")
    public ResponseEntity<List<MedicalHistoryResponse>> getMedicalHistory(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(healthDataService.getMedicalHistory(email));
    }

    @GetMapping("/previous-diseases")
    @Operation(summary = "List resolved medical conditions")
    public ResponseEntity<List<MedicalHistoryResponse>> getPreviousDiseases(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(healthDataService.getPreviousDiseases(email));
    }
}
