package com.healthid.controller;

import com.healthid.dto.profile.ProfileResponse;
import com.healthid.dto.profile.UpdateProfileRequest;
import com.healthid.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@Tag(name = "Profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get authenticated user's health profile")
    public ResponseEntity<ProfileResponse> getMyProfile(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(profileService.getProfile(email, null));
    }

    @PutMapping("/me")
    @Operation(summary = "Update authenticated user's profile")
    public ResponseEntity<ProfileResponse> updateMyProfile(
            @AuthenticationPrincipal String email,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(email, request));
    }
}
