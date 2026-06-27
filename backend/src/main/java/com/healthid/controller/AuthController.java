package com.healthid.controller;

import com.healthid.dto.auth.*;
import com.healthid.security.JwtFilter;
import com.healthid.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user and generate Health ID")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @PostMapping("/google")
    @Operation(summary = "Google OAuth code exchange")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.googleAuth(request, response));
    }

    @PostMapping("/github")
    @Operation(summary = "GitHub OAuth code exchange")
    public ResponseEntity<AuthResponse> github(@Valid @RequestBody GitHubAuthRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.githubAuth(request, response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT access token")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractCookie(request, JwtFilter.REFRESH_TOKEN_COOKIE);
        return ResponseEntity.ok(authService.refresh(refreshToken, response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Sign out and clear auth cookies")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal String email,
            HttpServletResponse response) {
        authService.logout(email, response);
        return ResponseEntity.noContent().build();
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
