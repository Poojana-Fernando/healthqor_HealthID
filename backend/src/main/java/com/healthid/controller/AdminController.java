package com.healthid.controller;

import com.healthid.dto.admin.*;
import com.healthid.dto.appointment.AppointmentResponse;
import com.healthid.dto.support.AdminSupportTicketResponse;
import com.healthid.dto.support.SupportTicketStatusUpdateRequest;
import com.healthid.entity.SupportTicketStatus;
import com.healthid.service.AdminService;
import com.healthid.service.SupportTicketService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin")
public class AdminController {

    private final AdminService adminService;
    private final SupportTicketService supportTicketService;

    public AdminController(AdminService adminService, SupportTicketService supportTicketService) {
        this.adminService = adminService;
        this.supportTicketService = supportTicketService;
    }

    @GetMapping("/users")
    @Operation(summary = "Paginated user list with search")
    public ResponseEntity<Page<AdminUserResponse>> users(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminService.listUsers(search, pageable));
    }

    @GetMapping("/users/lookup")
    @Operation(summary = "Lookup user by Health ID or email")
    public ResponseEntity<AdminUserResponse> lookup(@RequestParam String identifier) {
        return ResponseEntity.ok(adminService.lookupUser(identifier));
    }

    @GetMapping("/doctors")
    @Operation(summary = "Paginated doctor list with search, filters, and sort")
    public ResponseEntity<Page<AdminDoctorResponse>> doctors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(required = false) String sortBy,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminService.listDoctors(search, specialization, verified, sortBy, pageable));
    }

    @PostMapping("/doctors")
    @Operation(summary = "Create doctor and send password setup invitation")
    public ResponseEntity<AdminDoctorResponse> createDoctor(@Valid @RequestBody AdminCreateDoctorRequest request) {
        return ResponseEntity.ok(adminService.createDoctor(request));
    }

    @GetMapping("/doctors/{id}")
    @Operation(summary = "Get doctor details with booking count")
    public ResponseEntity<AdminDoctorResponse> getDoctor(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getDoctor(id));
    }

    @PutMapping("/doctors/{id}")
    @Operation(summary = "Update doctor profile")
    public ResponseEntity<AdminDoctorResponse> updateDoctor(
            @PathVariable String id,
            @Valid @RequestBody AdminUpdateDoctorRequest request) {
        return ResponseEntity.ok(adminService.updateDoctor(id, request));
    }

    @DeleteMapping("/doctors/{id}")
    @Operation(summary = "Deactivate doctor (soft delete)")
    public ResponseEntity<Map<String, String>> deactivateDoctor(@PathVariable String id) {
        adminService.deactivateDoctor(id);
        return ResponseEntity.ok(Map.of("status", "deactivated"));
    }

    @GetMapping("/doctors/{id}/appointments")
    @Operation(summary = "Paginated appointments for a doctor")
    public ResponseEntity<Page<AppointmentResponse>> doctorAppointments(
            @PathVariable String id,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminService.doctorAppointments(id, pageable));
    }

    @PostMapping("/doctors/{id}/verify")
    @Operation(summary = "Approve or reject doctor account")
    public ResponseEntity<Map<String, String>> verifyDoctor(
            @PathVariable String id,
            @RequestParam(defaultValue = "true") boolean approved) {
        adminService.verifyDoctor(id, approved);
        return ResponseEntity.ok(Map.of("status", approved ? "verified" : "rejected"));
    }

    @GetMapping("/patients")
    @Operation(summary = "Paginated patient list with search")
    public ResponseEntity<Page<AdminPatientResponse>> patients(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminService.listPatients(search, pageable));
    }

    @GetMapping("/patients/{id}")
    @Operation(summary = "Get patient details with health summary")
    public ResponseEntity<AdminPatientResponse> getPatient(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getPatient(id));
    }

    @DeleteMapping("/patients/{id}")
    @Operation(summary = "Permanently delete a patient and all related data")
    public ResponseEntity<Map<String, String>> deletePatient(@PathVariable String id) {
        adminService.deletePatient(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/patients/{id}/appointments")
    @Operation(summary = "Paginated appointments for a patient")
    public ResponseEntity<Page<AppointmentResponse>> patientAppointments(
            @PathVariable String id,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(adminService.patientAppointments(id, pageable));
    }

    @PostMapping("/appointments/{id}/cancel")
    @Operation(summary = "Admin cancel an appointment")
    public ResponseEntity<AppointmentResponse> cancelAppointment(@PathVariable String id) {
        return ResponseEntity.ok(adminService.cancelAppointment(id));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Paginated audit log viewer")
    public ResponseEntity<Page<AuditLogResponse>> auditLogs(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(adminService.getAuditLogs(pageable));
    }

    @GetMapping("/stats")
    @Operation(summary = "System statistics dashboard")
    public ResponseEntity<SystemStatsResponse> stats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @GetMapping("/support-tickets")
    @Operation(summary = "Paginated support ticket list with filters")
    public ResponseEntity<Page<AdminSupportTicketResponse>> supportTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SupportTicketStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(supportTicketService.listTicketsForAdmin(
                search, status, category, priority, pageable));
    }

    @GetMapping("/support-tickets/{id}")
    @Operation(summary = "Get support ticket details")
    public ResponseEntity<AdminSupportTicketResponse> supportTicket(@PathVariable String id) {
        return ResponseEntity.ok(supportTicketService.getTicketForAdmin(id));
    }

    @PatchMapping("/support-tickets/{id}/status")
    @Operation(summary = "Update support ticket status")
    public ResponseEntity<AdminSupportTicketResponse> updateSupportTicketStatus(
            @PathVariable String id,
            @Valid @RequestBody SupportTicketStatusUpdateRequest request) {
        return ResponseEntity.ok(supportTicketService.updateStatus(id, request.getStatus()));
    }

    @GetMapping("/support-tickets/{id}/attachment")
    @Operation(summary = "Download support ticket attachment")
    public ResponseEntity<Resource> supportTicketAttachment(@PathVariable String id) {
        AdminSupportTicketResponse ticket = supportTicketService.getTicketForAdmin(id);
        Resource resource = supportTicketService.getAttachmentResource(id);
        String filename = ticket.getAttachmentFileName() != null ? ticket.getAttachmentFileName() : "attachment";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }
}
