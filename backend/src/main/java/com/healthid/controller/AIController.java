package com.healthid.controller;

import com.healthid.dto.ai.ChatRequest;
import com.healthid.dto.ai.ChatResponse;
import com.healthid.dto.ai.HealthAnalysisRequest;
import com.healthid.dto.ai.HealthAnalysisResponse;
import com.healthid.dto.ai.SymptomCheckRequest;
import com.healthid.dto.ai.SymptomCheckResponse;
import com.healthid.service.AIService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "AI")
public class AIController {

    private final AIService aiService;

    public AIController(AIService aiService) {
        this.aiService = aiService;
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
}
