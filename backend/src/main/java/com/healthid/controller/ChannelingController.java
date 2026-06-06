package com.healthid.controller;

import com.healthid.dto.appointment.AppointmentRequest;
import com.healthid.dto.appointment.AppointmentResponse;
import com.healthid.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@Tag(name = "Appointments")
public class ChannelingController {

    private final AppointmentService appointmentService;

    public ChannelingController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    @Operation(summary = "Book an appointment")
    public ResponseEntity<AppointmentResponse> book(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.bookAppointment(email, request));
    }

    @GetMapping("/mine")
    @Operation(summary = "List user's appointments")
    public ResponseEntity<List<AppointmentResponse>> mine(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(appointmentService.getMyAppointments(email));
    }
}
