package com.healthid.service;

import com.healthid.dto.admin.*;
import com.healthid.dto.appointment.AppointmentResponse;
import com.healthid.entity.*;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.AppointmentRepository;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final AuditLogService auditLogService;
    private final PasswordResetService passwordResetService;
    private final PasswordEncoder passwordEncoder;
    private final EncryptionService encryptionService;
    private final HealthIdGenerator healthIdGenerator;

    public AdminService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            HealthProfileRepository healthProfileRepository,
            AppointmentRepository appointmentRepository,
            AuditLogService auditLogService,
            PasswordResetService passwordResetService,
            PasswordEncoder passwordEncoder,
            EncryptionService encryptionService,
            HealthIdGenerator healthIdGenerator) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.appointmentRepository = appointmentRepository;
        this.auditLogService = auditLogService;
        this.passwordResetService = passwordResetService;
        this.passwordEncoder = passwordEncoder;
        this.encryptionService = encryptionService;
        this.healthIdGenerator = healthIdGenerator;
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

    @Transactional(readOnly = true)
    public Page<AdminDoctorResponse> listDoctors(
            String search,
            String specialization,
            Boolean verified,
            String sortBy,
            Pageable pageable) {
        Page<Doctor> doctors = queryDoctors(search, specialization, verified, pageable);
        Page<AdminDoctorResponse> mapped = doctors.map(this::mapDoctor);
        if ("bookings".equalsIgnoreCase(sortBy)) {
            List<AdminDoctorResponse> sorted = mapped.getContent().stream()
                    .sorted(Comparator.comparingLong(AdminDoctorResponse::getBookingCount).reversed())
                    .collect(Collectors.toList());
            return new org.springframework.data.domain.PageImpl<>(sorted, pageable, mapped.getTotalElements());
        }
        return mapped;
    }

    @Transactional(readOnly = true)
    public AdminDoctorResponse getDoctor(String doctorId) {
        Doctor doctor = requireActiveOrAnyDoctor(doctorId);
        return mapDoctor(doctor);
    }

    @Transactional
    public AdminDoctorResponse createDoctor(AdminCreateDoctorRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }
        if (doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new BadRequestException("License number already registered");
        }

        String healthId = healthIdGenerator.generate(
                request.getCountry(), request.getBirthDate(), request.getNationalId());
        while (userRepository.existsByHealthId(healthId)) {
            healthId = healthIdGenerator.generate(
                    request.getCountry(), request.getBirthDate(), request.getNationalId());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .country(request.getCountry())
                .nationalId(encryptionService.encryptNationalId(request.getNationalId()))
                .healthId(healthId)
                .role(Role.DOCTOR)
                .verified(true)
                .emailVerifiedAt(Instant.now())
                .phoneVerified(true)
                .phoneVerifiedAt(Instant.now())
                .build();
        userRepository.save(user);

        HealthProfile profile = HealthProfile.builder()
                .userId(user.getId())
                .gender(request.getGender())
                .birthDate(request.getBirthDate())
                .doctorVerified(false)
                .build();
        healthProfileRepository.save(profile);

        Doctor doctor = Doctor.builder()
                .userId(user.getId())
                .nameTitle(request.getNameTitle())
                .nic(encryptionService.encryptNationalId(request.getNationalId()))
                .specialization(request.getSpecialization())
                .hospital(request.getHospital())
                .licenseNumber(request.getLicenseNumber())
                .education(mapEducation(request.getEducation()))
                .experienceYears(request.getExperienceYears())
                .maritalStatus(request.getMaritalStatus())
                .verifiedByAdmin(false)
                .available(false)
                .lat(request.getLat())
                .lng(request.getLng())
                .build();
        doctorRepository.save(doctor);

        passwordResetService.requestReset(user.getEmail());
        auditLogService.log(null, "CREATE_DOCTOR", "Doctor", doctor.getId());

        return mapDoctor(doctor);
    }

    @Transactional
    public AdminDoctorResponse updateDoctor(String doctorId, AdminUpdateDoctorRequest request) {
        Doctor doctor = requireActiveDoctor(doctorId);
        if (request.getNameTitle() != null) {
            doctor.setNameTitle(request.getNameTitle());
        }
        if (request.getSpecialization() != null) {
            doctor.setSpecialization(request.getSpecialization());
        }
        if (request.getHospital() != null) {
            doctor.setHospital(request.getHospital());
        }
        if (request.getLicenseNumber() != null) {
            if (!request.getLicenseNumber().equals(doctor.getLicenseNumber())
                    && doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
                throw new BadRequestException("License number already registered");
            }
            doctor.setLicenseNumber(request.getLicenseNumber());
        }
        if (request.getEducation() != null) {
            doctor.setEducation(mapEducation(request.getEducation()));
        }
        if (request.getExperienceYears() != null) {
            doctor.setExperienceYears(request.getExperienceYears());
        }
        if (request.getMaritalStatus() != null) {
            doctor.setMaritalStatus(request.getMaritalStatus());
        }
        if (request.getAvailable() != null) {
            doctor.setAvailable(request.getAvailable());
        }
        if (request.getLat() != null) {
            doctor.setLat(request.getLat());
        }
        if (request.getLng() != null) {
            doctor.setLng(request.getLng());
        }
        doctor.touchUpdatedAt();
        doctorRepository.save(doctor);
        auditLogService.log(null, "UPDATE_DOCTOR", "Doctor", doctor.getId());
        return mapDoctor(doctor);
    }

    @Transactional
    public void deactivateDoctor(String doctorId) {
        Doctor doctor = requireActiveDoctor(doctorId);
        doctor.setDeactivatedAt(Instant.now());
        doctor.setAvailable(false);
        doctor.touchUpdatedAt();
        doctorRepository.save(doctor);
        auditLogService.log(null, "DEACTIVATE_DOCTOR", "Doctor", doctor.getId());
    }

    @Transactional
    public void verifyDoctor(String doctorId, boolean approved) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        doctor.setVerifiedByAdmin(approved);
        doctor.setAvailable(approved);
        doctor.touchUpdatedAt();
        doctorRepository.save(doctor);

        HealthProfile profile = healthProfileRepository.findByUserId(doctor.getUserId()).orElse(null);
        if (profile != null) {
            profile.setDoctorVerified(approved);
            healthProfileRepository.save(profile);
        }
        auditLogService.log(null, approved ? "VERIFY_DOCTOR" : "REJECT_DOCTOR", "Doctor", doctorId);
    }

    @Transactional(readOnly = true)
    public Page<AppointmentResponse> doctorAppointments(String doctorId, Pageable pageable) {
        requireActiveOrAnyDoctor(doctorId);
        return appointmentRepository.findByDoctorIdOrderByScheduledAtDesc(doctorId, pageable)
                .map(this::mapAppointment);
    }

    @Transactional(readOnly = true)
    public Page<AdminPatientResponse> listPatients(String search, Pageable pageable) {
        Page<User> patients;
        if (search != null && !search.isBlank()) {
            patients = userRepository.searchUsersByRole(search, Role.CITIZEN, pageable);
        } else {
            patients = userRepository.findByRole(Role.CITIZEN, pageable);
        }
        return patients.map(this::mapPatient);
    }

    @Transactional(readOnly = true)
    public AdminPatientResponse getPatient(String patientId) {
        User user = userRepository.findById(patientId)
                .filter(u -> u.getRole() == Role.CITIZEN)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        return mapPatient(user);
    }

    @Transactional(readOnly = true)
    public Page<AppointmentResponse> patientAppointments(String patientId, Pageable pageable) {
        User user = userRepository.findById(patientId)
                .filter(u -> u.getRole() == Role.CITIZEN)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        return appointmentRepository.findByPatientIdOrderByScheduledAtDesc(user.getId(), pageable)
                .map(this::mapAppointment);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(String appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Appointment is already cancelled");
        }
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointmentRepository.save(appointment);
        auditLogService.log(null, "ADMIN_CANCEL_APPOINTMENT", "Appointment", appointmentId);
        return mapAppointment(appointment);
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
                .totalPatients(userRepository.countByRole(Role.CITIZEN))
                .appointmentsToday(appointmentRepository.countByScheduledAtBetween(startOfDay, endOfDay))
                .cancelledToday(appointmentRepository.countByStatusAndCreatedAtBetween(
                        AppointmentStatus.CANCELLED, startOfDay, endOfDay))
                .pendingDoctorVerifications(doctorRepository.countByDeactivatedAtIsNullAndVerifiedByAdmin(false))
                .totalAuditLogs(auditLogService.countAll())
                .build();
    }

    private Page<Doctor> queryDoctors(
            String search, String specialization, Boolean verified, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return doctorRepository.searchActiveDoctors(search.trim(), pageable);
        }
        if (specialization != null && !specialization.isBlank() && verified != null) {
            Page<Doctor> page = doctorRepository.findByDeactivatedAtIsNullAndSpecializationContainingIgnoreCase(
                    specialization.trim(), pageable);
            if (verified) {
                List<Doctor> filtered = page.getContent().stream()
                        .filter(Doctor::isVerifiedByAdmin)
                        .collect(Collectors.toList());
                return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
            }
            List<Doctor> filtered = page.getContent().stream()
                    .filter(d -> !d.isVerifiedByAdmin())
                    .collect(Collectors.toList());
            return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        }
        if (specialization != null && !specialization.isBlank()) {
            return doctorRepository.findByDeactivatedAtIsNullAndSpecializationContainingIgnoreCase(
                    specialization.trim(), pageable);
        }
        if (verified != null) {
            return doctorRepository.findByDeactivatedAtIsNullAndVerifiedByAdmin(verified, pageable);
        }
        return doctorRepository.findByDeactivatedAtIsNull(pageable);
    }

    private Doctor requireActiveDoctor(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        if (!doctor.isActive()) {
            throw new BadRequestException("Doctor is deactivated");
        }
        return doctor;
    }

    private Doctor requireActiveOrAnyDoctor(String doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
    }

    private List<DoctorEducation> mapEducation(List<DoctorEducationDto> education) {
        return education.stream()
                .map(dto -> DoctorEducation.builder()
                        .degree(dto.getDegree())
                        .institution(dto.getInstitution())
                        .year(dto.getYear())
                        .build())
                .collect(Collectors.toList());
    }

    private AdminDoctorResponse mapDoctor(Doctor doctor) {
        User user = userRepository.findById(doctor.getUserId()).orElse(null);
        return AdminDoctorResponse.builder()
                .id(doctor.getId())
                .userId(doctor.getUserId())
                .name(user != null ? user.getName() : "Unknown")
                .email(user != null ? user.getEmail() : null)
                .healthId(user != null ? user.getHealthId() : null)
                .nameTitle(doctor.getNameTitle())
                .specialization(doctor.getSpecialization())
                .hospital(doctor.getHospital())
                .licenseNumber(doctor.getLicenseNumber())
                .education(doctor.getEducation())
                .experienceYears(doctor.getExperienceYears())
                .maritalStatus(doctor.getMaritalStatus())
                .verifiedByAdmin(doctor.isVerifiedByAdmin())
                .available(doctor.isAvailable())
                .avgRating(doctor.getAvgRating())
                .lat(doctor.getLat())
                .lng(doctor.getLng())
                .bookingCount(appointmentRepository.countByDoctorId(doctor.getId()))
                .createdAt(doctor.getCreatedAt())
                .deactivatedAt(doctor.getDeactivatedAt())
                .build();
    }

    private AdminPatientResponse mapPatient(User user) {
        HealthProfile profile = healthProfileRepository.findByUserId(user.getId()).orElse(null);
        AdminPatientHealthSummary summary = null;
        if (profile != null) {
            summary = AdminPatientHealthSummary.builder()
                    .gender(profile.getGender())
                    .bloodType(profile.getBloodType())
                    .bmi(profile.getBmi())
                    .birthDate(profile.getBirthDate())
                    .build();
        }
        return AdminPatientResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .healthId(user.getHealthId())
                .mobile(user.getMobile())
                .phoneVerified(user.isPhoneVerified())
                .emailVerified(user.getEmailVerifiedAt() != null)
                .createdAt(user.getCreatedAt())
                .healthSummary(summary)
                .build();
    }

    private AppointmentResponse mapAppointment(Appointment appointment) {
        Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        User doctorUser = doctor != null ? userRepository.findById(doctor.getUserId()).orElse(null) : null;
        User patient = userRepository.findById(appointment.getPatientId()).orElse(null);
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .referenceNumber(appointment.getId().substring(0, 8).toUpperCase())
                .doctorId(appointment.getDoctorId())
                .doctorName(doctorUser != null ? doctorUser.getName() : "Unknown")
                .patientId(appointment.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .specialization(doctor != null ? doctor.getSpecialization() : null)
                .hospital(doctor != null ? doctor.getHospital() : null)
                .scheduledAt(appointment.getScheduledAt())
                .status(appointment.getStatus())
                .createdAt(appointment.getCreatedAt())
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
