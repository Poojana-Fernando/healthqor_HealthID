package com.healthid.controller;

import com.healthid.dto.healthdata.MedicalHistoryResponse;
import com.healthid.dto.healthdata.VaccinationRequest;
import com.healthid.dto.healthdata.VaccinationResponse;
import com.healthid.dto.healthdata.VitalsSnapshotResponse;
import com.healthid.dto.medicalreport.ActivePrescriptionResponse;
import com.healthid.dto.medicalreport.PatientReportResponse;
import com.healthid.service.HealthDataService;
import com.healthid.service.MedicalReportService;
import com.healthid.service.VitalsSnapshotService;
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
    private final MedicalReportService medicalReportService;
    private final VitalsSnapshotService vitalsSnapshotService;

    public HealthDataController(
            HealthDataService healthDataService,
            MedicalReportService medicalReportService,
            VitalsSnapshotService vitalsSnapshotService) {
        this.healthDataService = healthDataService;
        this.medicalReportService = medicalReportService;
        this.vitalsSnapshotService = vitalsSnapshotService;
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

    @GetMapping("/medical-reports")
    @Operation(summary = "List own medical visit reports from doctors")
    public ResponseEntity<List<PatientReportResponse>> getMedicalReports(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(medicalReportService.getMyReports(email));
    }

    @GetMapping("/prescriptions/active")
    @Operation(summary = "List active prescriptions from visit reports")
    public ResponseEntity<List<ActivePrescriptionResponse>> getActivePrescriptions(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(medicalReportService.getActivePrescriptions(email));
    }

    @GetMapping("/prescriptions")
    @Operation(summary = "List all prescriptions from visit reports")
    public ResponseEntity<List<ActivePrescriptionResponse>> getAllPrescriptions(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(medicalReportService.getAllPrescriptions(email));
    }

    @GetMapping("/vitals-history")
    @Operation(summary = "List vitals snapshots for trend charts")
    public ResponseEntity<List<VitalsSnapshotResponse>> getVitalsHistory(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(vitalsSnapshotService.getHistory(email));
    }
}
