package com.healthid.controller;

import com.healthid.dto.ai.ChatRequest;
import com.healthid.dto.ai.ChatResponse;
import com.healthid.dto.ai.HealthAnalysisRequest;
import com.healthid.dto.ai.HealthAnalysisResponse;
import com.healthid.dto.ai.ReportAnalysisResponse;
import com.healthid.dto.ai.SymptomCheckRequest;
import com.healthid.dto.ai.SymptomCheckResponse;
import com.healthid.service.AIService;
import com.healthid.service.ReportAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "AI")
public class AIController {

    private final AIService aiService;
    private final ReportAnalysisService reportAnalysisService;

    public AIController(AIService aiService, ReportAnalysisService reportAnalysisService) {
        this.aiService = aiService;
        this.reportAnalysisService = reportAnalysisService;
    }

    @PostMapping("/symptom-check")
    @Operation(summary = "AI symptom triage with doctor recommendations")
    public ResponseEntity<SymptomCheckResponse> symptomCheck(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody SymptomCheckRequest request,
            @RequestParam(required = false) BigDecimal lat,
            @RequestParam(required = false) BigDecimal lng) {
        return ResponseEntity.ok(aiService.symptomCheck(email, request, lat, lng));
    }

    @PostMapping("/health-analysis")
    @Operation(summary = "AI health profile analysis")
    public ResponseEntity<HealthAnalysisResponse> healthAnalysis(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody HealthAnalysisRequest request) {
        return ResponseEntity.ok(aiService.healthAnalysis(email, request));
    }

    @PostMapping("/chat")
    @Operation(summary = "Medical assistant chatbot — human health and app help only")
    public ResponseEntity<ChatResponse> chat(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(aiService.chat(email, request));
    }

    @PostMapping(value = "/analyze-report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload external lab report for AI analysis")
    public ResponseEntity<ReportAnalysisResponse> analyzeReport(
            @AuthenticationPrincipal String email,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(reportAnalysisService.analyzeReport(email, file));
    }

    @GetMapping("/analyze-report/history")
    @Operation(summary = "List past external report analyses")
    public ResponseEntity<List<ReportAnalysisResponse>> reportAnalysisHistory(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(reportAnalysisService.getHistory(email));
    }

    @GetMapping("/analyze-report/{id}/image")
    @Operation(summary = "Download stored report image")
    public ResponseEntity<Resource> reportAnalysisImage(
            @AuthenticationPrincipal String email,
            @PathVariable String id) {
        Resource resource = reportAnalysisService.getImage(email, id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"report\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
