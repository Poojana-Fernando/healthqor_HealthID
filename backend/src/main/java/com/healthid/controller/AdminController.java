package com.healthid.controller;

import com.healthid.dto.admin.AdminUserResponse;
import com.healthid.dto.admin.AuditLogResponse;
import com.healthid.dto.admin.SystemStatsResponse;
import com.healthid.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
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

    @PostMapping("/doctors/{id}/verify")
    @Operation(summary = "Approve or reject doctor account")
    public ResponseEntity<Map<String, String>> verifyDoctor(
            @PathVariable String id,
            @RequestParam(defaultValue = "true") boolean approved) {
        adminService.verifyDoctor(id, approved);
        return ResponseEntity.ok(Map.of("status", approved ? "verified" : "rejected"));
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
}
