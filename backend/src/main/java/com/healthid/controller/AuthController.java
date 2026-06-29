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
    public ResponseEntity<AuthResultResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<AuthResultResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verify email with OTP or magic link token")
    public ResponseEntity<AuthResultResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.verifyEmail(request, response));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend verification email for an active challenge")
    public ResponseEntity<AuthResultResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        return ResponseEntity.ok(authService.resendVerification(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset email")
    public ResponseEntity<ForgotPasswordResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with OTP or magic link token")
    public ResponseEntity<ResetPasswordResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @PostMapping("/resend-password-reset")
    @Operation(summary = "Resend password reset email for an active challenge")
    public ResponseEntity<ForgotPasswordResponse> resendPasswordReset(@Valid @RequestBody ResendPasswordResetRequest request) {
        return ResponseEntity.ok(authService.resendPasswordReset(request));
    }

    @PostMapping("/google")
    @Operation(summary = "Google OAuth code exchange")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(authService.googleAuth(request, response));
    }

    @PostMapping("/send-phone-otp")
    @Operation(summary = "Send SMS verification code to registered mobile")
    public ResponseEntity<SendPhoneOtpResponse> sendPhoneOtp(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(authService.sendPhoneOtp(email));
    }

    @PostMapping("/resend-phone-otp")
    @Operation(summary = "Resend SMS verification code")
    public ResponseEntity<SendPhoneOtpResponse> resendPhoneOtp(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(authService.resendPhoneOtp(email));
    }

    @PostMapping("/verify-phone")
    @Operation(summary = "Verify mobile number with SMS OTP")
    public ResponseEntity<VerifyPhoneResponse> verifyPhone(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody VerifyPhoneRequest request) {
        return ResponseEntity.ok(authService.verifyPhone(email, request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT access token")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractCookie(request, JwtFilter.REFRESH_TOKEN_COOKIE);
        return ResponseEntity.ok(authService.refresh(refreshToken, response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Sign out and clear auth cookies")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authService.logout(response);
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
