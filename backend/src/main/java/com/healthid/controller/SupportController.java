package com.healthid.controller;

import com.healthid.dto.support.SupportTicketResponse;
import com.healthid.dto.support.SupportTicketSubmitRequest;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import com.healthid.service.SupportTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/support")
@Tag(name = "Support")
public class SupportController {

    private final SupportTicketService supportTicketService;
    private final UserRepository userRepository;

    public SupportController(SupportTicketService supportTicketService, UserRepository userRepository) {
        this.supportTicketService = supportTicketService;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/tickets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit a support ticket (public)")
    public ResponseEntity<SupportTicketResponse> submitTicket(
            @AuthenticationPrincipal String email,
            @Valid @RequestPart("ticket") SupportTicketSubmitRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        String userId = null;
        if (email != null) {
            userId = userRepository.findByEmail(email)
                    .map(User::getId)
                    .orElse(null);
        }
        return ResponseEntity.ok(supportTicketService.createTicket(request, file, userId));
    }

    @GetMapping("/tickets/mine")
    @Operation(summary = "List support tickets for the authenticated user")
    public ResponseEntity<Page<SupportTicketResponse>> myTickets(
            @AuthenticationPrincipal String email,
            @PageableDefault(size = 20) Pageable pageable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.healthid.exception.ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(supportTicketService.listTicketsForUser(user.getId(), pageable));
    }
}
