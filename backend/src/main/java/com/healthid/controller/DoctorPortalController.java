package com.healthid.controller;

import com.healthid.dto.doctorportal.*;
import com.healthid.entity.AppointmentStatus;
import com.healthid.dto.medicalreport.DoctorReportResponse;
import com.healthid.dto.medicalreport.SubmitPatientReportRequest;
import com.healthid.service.DoctorPortalService;
import com.healthid.service.MedicalReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/doctor")
@Tag(name = "Doctor Portal")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorPortalController {

    private final DoctorPortalService doctorPortalService;
    private final MedicalReportService medicalReportService;

    public DoctorPortalController(DoctorPortalService doctorPortalService, MedicalReportService medicalReportService) {
        this.doctorPortalService = doctorPortalService;
        this.medicalReportService = medicalReportService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get logged-in doctor profile")
    public ResponseEntity<DoctorPortalResponse> getMe(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(doctorPortalService.getMe(email));
    }

    @PutMapping("/me")
    @Operation(summary = "Update doctor profile fields")
    public ResponseEntity<DoctorPortalResponse> updateProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody DoctorProfileUpdateRequest request) {
        return ResponseEntity.ok(doctorPortalService.updateProfile(email, request));
    }

    @PatchMapping("/me/availability")
    @Operation(summary = "Toggle master availability for bookings")
    public ResponseEntity<DoctorPortalResponse> setAvailability(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody DoctorAvailabilityRequest request) {
        return ResponseEntity.ok(doctorPortalService.setAvailability(email, request));
    }

    @GetMapping("/stats")
    @Operation(summary = "Dashboard statistics")
    public ResponseEntity<DoctorDashboardStatsResponse> stats(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(doctorPortalService.getDashboardStats(email));
    }

    @GetMapping("/appointments")
    @Operation(summary = "List appointments for logged-in doctor")
    public ResponseEntity<Page<DoctorAppointmentResponse>> appointments(
            @AuthenticationPrincipal String email,
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(doctorPortalService.listAppointments(email, status, from, to, pageable));
    }

    @GetMapping("/appointments/{id}")
    @Operation(summary = "Get appointment detail with patient health summary")
    public ResponseEntity<DoctorAppointmentResponse> appointment(
            @AuthenticationPrincipal String email,
            @PathVariable String id) {
        return ResponseEntity.ok(doctorPortalService.getAppointment(email, id));
    }

    @PatchMapping("/appointments/{id}/status")
    @Operation(summary = "Confirm or cancel an appointment")
    public ResponseEntity<DoctorAppointmentResponse> updateStatus(
            @AuthenticationPrincipal String email,
            @PathVariable String id,
            @Valid @RequestBody UpdateAppointmentStatusRequest request) {
        return ResponseEntity.ok(doctorPortalService.updateAppointmentStatus(email, id, request));
    }

    @PostMapping("/appointments/{id}/complete")
    @Operation(summary = "Complete appointment with patient visit report")
    public ResponseEntity<DoctorReportResponse> completeAppointment(
            @AuthenticationPrincipal String email,
            @PathVariable String id,
            @Valid @RequestBody SubmitPatientReportRequest request) {
        return ResponseEntity.ok(medicalReportService.submitReport(email, id, request));
    }

    @GetMapping("/schedule")
    @Operation(summary = "Get weekly availability schedule")
    public ResponseEntity<DoctorScheduleResponse> getSchedule(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(doctorPortalService.getSchedule(email));
    }

    @PutMapping("/schedule")
    @Operation(summary = "Replace weekly availability schedule")
    public ResponseEntity<DoctorScheduleResponse> updateSchedule(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody DoctorScheduleRequest request) {
        return ResponseEntity.ok(doctorPortalService.updateSchedule(email, request));
    }
}
