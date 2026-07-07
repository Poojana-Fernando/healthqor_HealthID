package com.healthid.service;

import com.healthid.dto.healthdata.VitalsSnapshotResponse;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.User;
import com.healthid.entity.VitalsSnapshot;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import com.healthid.repository.VitalsSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class VitalsSnapshotService {

    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final VitalsSnapshotRepository vitalsSnapshotRepository;
    private final AuditLogService auditLogService;

    public VitalsSnapshotService(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            VitalsSnapshotRepository vitalsSnapshotRepository,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.vitalsSnapshotRepository = vitalsSnapshotRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<VitalsSnapshotResponse> getHistory(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        auditLogService.log(user.getId(), "READ", "VitalsSnapshot", user.getId());
        return vitalsSnapshotRepository.findByUserIdOrderByRecordedAtAsc(user.getId()).stream()
                .map(this::map)
                .toList();
    }

    @Transactional
    public void recordIfChanged(String userId, BigDecimal heightCm, BigDecimal weightKg, BigDecimal bmi) {
        if (heightCm == null && weightKg == null && bmi == null) {
            return;
        }
        List<VitalsSnapshot> existing = vitalsSnapshotRepository.findByUserIdOrderByRecordedAtAsc(userId);
        if (!existing.isEmpty()) {
            VitalsSnapshot latest = existing.get(existing.size() - 1);
            if (equalsDecimal(latest.getHeightCm(), heightCm)
                    && equalsDecimal(latest.getWeightKg(), weightKg)
                    && equalsDecimal(latest.getBmi(), bmi)) {
                return;
            }
        }
        VitalsSnapshot snapshot = VitalsSnapshot.builder()
                .userId(userId)
                .heightCm(heightCm)
                .weightKg(weightKg)
                .bmi(bmi)
                .build();
        vitalsSnapshotRepository.save(snapshot);
    }

    @Transactional
    public void ensureInitialSnapshot(String userId) {
        healthProfileRepository.findByUserId(userId).ifPresent(profile -> {
            if (profile.getHeightCm() != null || profile.getWeightKg() != null || profile.getBmi() != null) {
                List<VitalsSnapshot> existing = vitalsSnapshotRepository.findByUserIdOrderByRecordedAtAsc(userId);
                if (existing.isEmpty()) {
                    recordIfChanged(userId, profile.getHeightCm(), profile.getWeightKg(), profile.getBmi());
                }
            }
        });
    }

    private boolean equalsDecimal(BigDecimal a, BigDecimal b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.compareTo(b) == 0;
    }

    private VitalsSnapshotResponse map(VitalsSnapshot snapshot) {
        return VitalsSnapshotResponse.builder()
                .id(snapshot.getId())
                .heightCm(snapshot.getHeightCm())
                .weightKg(snapshot.getWeightKg())
                .bmi(snapshot.getBmi())
                .recordedAt(snapshot.getRecordedAt())
                .build();
    }
}
