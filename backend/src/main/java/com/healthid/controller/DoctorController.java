package com.healthid.controller;

import com.healthid.dto.doctor.DoctorResponse;
import com.healthid.service.DoctorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@Tag(name = "Doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping("/nearby")
    @Operation(summary = "Find nearby available doctors")
    public ResponseEntity<List<DoctorResponse>> nearby(
            @RequestParam BigDecimal lat,
            @RequestParam BigDecimal lng,
            @RequestParam(required = false) String specialty) {
        return ResponseEntity.ok(doctorService.findNearby(lat, lng, specialty));
    }

    @GetMapping("/search")
    @Operation(summary = "Search doctors with filters")
    public ResponseEntity<List<DoctorResponse>> search(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Boolean available,
            @RequestParam(required = false) BigDecimal minRating) {
        return ResponseEntity.ok(doctorService.search(specialty, location, available, minRating));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get doctor by ID")
    public ResponseEntity<DoctorResponse> getDoctor(@PathVariable String id) {
        return ResponseEntity.ok(doctorService.getDoctor(id));
    }
}
