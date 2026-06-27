package com.healthid.service;

import com.healthid.dto.admin.AdminUserResponse;
import com.healthid.dto.admin.AuditLogResponse;
import com.healthid.dto.admin.SystemStatsResponse;
import com.healthid.entity.Doctor;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.User;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.AppointmentRepository;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final AuditLogService auditLogService;

    public AdminService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            HealthProfileRepository healthProfileRepository,
            AppointmentRepository appointmentRepository,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.appointmentRepository = appointmentRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> listUsers(String search, Pageable pageable) {
        Page<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.searchUsers(search, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return users.map(this::mapUser);
    }

    @Transactional(readOnly = true)
    public AdminUserResponse lookupUser(String identifier) {
        User user = userRepository.findByHealthId(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapUser(user);
    }

    @Transactional
    public void verifyDoctor(String doctorId, boolean approved) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        doctor.setAvailable(approved);
        doctorRepository.save(doctor);

        HealthProfile profile = healthProfileRepository.findByUserId(doctor.getUserId()).orElse(null);
        if (profile != null && approved) {
            profile.setDoctorVerified(true);
            healthProfileRepository.save(profile);
        }
        auditLogService.log(null, approved ? "VERIFY_DOCTOR" : "REJECT_DOCTOR", "Doctor", doctorId);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(Pageable pageable) {
        return auditLogService.getAuditLogs(pageable);
    }

    @Transactional(readOnly = true)
    public SystemStatsResponse getSystemStats() {
        Instant startOfDay = LocalDate.now().atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return SystemStatsResponse.builder()
                .totalUsers(userRepository.count())
                .totalDoctors(doctorRepository.count())
                .appointmentsToday(appointmentRepository.countByScheduledAtBetween(startOfDay, endOfDay))
                .totalAuditLogs(auditLogService.countAll())
                .build();
    }

    private AdminUserResponse mapUser(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .healthId(user.getHealthId())
                .role(user.getRole())
                .verified(user.isVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
