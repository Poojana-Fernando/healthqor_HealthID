package com.healthid.service;

import com.healthid.dto.profile.ProfileResponse;
import com.healthid.dto.profile.UpdateProfileRequest;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final AuditLogService auditLogService;
    private final EncryptionService encryptionService;

    public ProfileService(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            AuditLogService auditLogService,
            EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.auditLogService = auditLogService;
        this.encryptionService = encryptionService;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String requesterEmail, String targetUserId) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User target = userRepository.findById(targetUserId != null ? targetUserId : requester.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!requester.getId().equals(target.getId()) && requester.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Not authorized to view this profile");
        }

        HealthProfile profile = healthProfileRepository.findByUserId(target.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));

        auditLogService.log(requester.getId(), "READ", "HealthProfile", profile.getId());
        return mapProfile(target, profile);
    }

    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        HealthProfile profile = healthProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));

        if (request.getName() != null) user.setName(request.getName());
        if (request.getMobile() != null) {
            String normalized = request.getMobile().trim();
            if (!normalized.equals(user.getMobile())) {
                user.setMobile(normalized);
                user.setPhoneVerified(false);
                user.setPhoneVerifiedAt(null);
            }
        }
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getHeightCm() != null) profile.setHeightCm(request.getHeightCm());
        if (request.getWeightKg() != null) profile.setWeightKg(request.getWeightKg());
        if (request.getBirthDate() != null) profile.setBirthDate(request.getBirthDate());
        if (request.getEyesightLeft() != null) profile.setEyesightLeft(request.getEyesightLeft());
        if (request.getEyesightRight() != null) profile.setEyesightRight(request.getEyesightRight());
        if (request.getAllergies() != null) {
            profile.setAllergies(encryptionService.encryptOptional(String.join(",", request.getAllergies())));
        }

        profile.setBmi(calculateBmi(profile.getHeightCm(), profile.getWeightKg()));
        userRepository.save(user);
        healthProfileRepository.save(profile);

        auditLogService.log(user.getId(), "UPDATE", "HealthProfile", profile.getId());
        return mapProfile(user, profile);
    }

    private ProfileResponse mapProfile(User user, HealthProfile profile) {
        return ProfileResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .healthId(user.getHealthId())
                .country(user.getCountry())
                .mobile(user.getMobile())
                .profileImageUrl(user.getProfileImageUrl())
                .role(user.getRole())
                .verified(user.isVerified())
                .doctorVerified(profile.isDoctorVerified())
                .phoneVerified(user.isPhoneVerified())
                .gender(profile.getGender())
                .bloodType(profile.getBloodType())
                .heightCm(profile.getHeightCm())
                .weightKg(profile.getWeightKg())
                .bmi(profile.getBmi())
                .birthDate(profile.getBirthDate())
                .eyesightLeft(profile.getEyesightLeft())
                .eyesightRight(profile.getEyesightRight())
                .allergies(parseAllergies(encryptionService.decryptOptional(profile.getAllergies())))
                .aiHealthScore(profile.getAiHealthScore())
                .lastAiAnalysis(profile.getLastAiAnalysis())
                .build();
    }

    private List<String> parseAllergies(String allergies) {
        if (allergies == null || allergies.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(allergies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private BigDecimal calculateBmi(BigDecimal heightCm, BigDecimal weightKg) {
        if (heightCm == null || weightKg == null || heightCm.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal heightM = heightCm.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return weightKg.divide(heightM.multiply(heightM), 2, RoundingMode.HALF_UP);
    }
}
