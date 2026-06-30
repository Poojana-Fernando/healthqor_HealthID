package com.healthid.service;

import com.healthid.dto.doctorportal.*;
import com.healthid.entity.*;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DoctorPortalService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final DoctorScheduleRepository doctorScheduleRepository;
    private final AuditLogService auditLogService;
    private final EncryptionService encryptionService;
    private final AppointmentConfirmationService appointmentConfirmationService;

    public DoctorPortalService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            HealthProfileRepository healthProfileRepository,
            DoctorScheduleRepository doctorScheduleRepository,
            AuditLogService auditLogService,
            EncryptionService encryptionService,
            AppointmentConfirmationService appointmentConfirmationService) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.doctorScheduleRepository = doctorScheduleRepository;
        this.auditLogService = auditLogService;
        this.encryptionService = encryptionService;
        this.appointmentConfirmationService = appointmentConfirmationService;
    }

    @Transactional(readOnly = true)
    public DoctorPortalResponse getMe(String email) {
        return mapDoctor(requireDoctorByEmail(email));
    }

    @Transactional(readOnly = true)
    public DoctorDashboardStatsResponse getDashboardStats(String email) {
        Doctor doctor = requireDoctorByEmail(email);
        Instant startOfDay = LocalDate.now().atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        return DoctorDashboardStatsResponse.builder()
                .pendingToday(appointmentRepository.countByDoctorIdAndStatusAndScheduledAtBetween(
                        doctor.getId(), AppointmentStatus.PENDING, startOfDay, endOfDay))
                .confirmedToday(appointmentRepository.countByDoctorIdAndStatusAndScheduledAtBetween(
                        doctor.getId(), AppointmentStatus.CONFIRMED, startOfDay, endOfDay))
                .completedToday(appointmentRepository.countByDoctorIdAndStatusAndScheduledAtBetween(
                        doctor.getId(), AppointmentStatus.COMPLETED, startOfDay, endOfDay))
                .totalPending(appointmentRepository.countByDoctorIdAndStatus(
                        doctor.getId(), AppointmentStatus.PENDING))
                .available(doctor.isAvailable())
                .verifiedByAdmin(doctor.isVerifiedByAdmin())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<DoctorAppointmentResponse> listAppointments(
            String email, AppointmentStatus status, Instant from, Instant to, Pageable pageable) {
        Doctor doctor = requireDoctorByEmail(email);
        Page<Appointment> page = appointmentRepository.findByDoctorIdOrderByScheduledAtDesc(doctor.getId(), pageable);

        List<DoctorAppointmentResponse> filtered = page.getContent().stream()
                .filter(a -> status == null || a.getStatus() == status)
                .filter(a -> from == null || !a.getScheduledAt().isBefore(from))
                .filter(a -> to == null || !a.getScheduledAt().isAfter(to))
                .map(a -> mapAppointment(a, false))
                .collect(Collectors.toList());

        return new PageImpl<>(filtered, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DoctorAppointmentResponse getAppointment(String email, String appointmentId) {
        Doctor doctor = requireDoctorByEmail(email);
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);
        auditLogService.log(doctor.getUserId(), "DOCTOR_READ_PATIENT_SUMMARY", "Appointment", appointmentId);
        return mapAppointment(appointment, true);
    }

    @Transactional
    public DoctorAppointmentResponse updateAppointmentStatus(
            String email, String appointmentId, UpdateAppointmentStatusRequest request) {
        Doctor doctor = requireDoctorByEmail(email);
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);

        validateStatusTransition(appointment.getStatus(), request.getStatus());
        AppointmentStatus previousStatus = appointment.getStatus();
        appointment.setStatus(request.getStatus());
        appointmentRepository.save(appointment);

        if (previousStatus != AppointmentStatus.CONFIRMED && request.getStatus() == AppointmentStatus.CONFIRMED) {
            appointmentConfirmationService.sendDoctorConfirmationReceipt(appointment, doctor);
        }

        String action = switch (request.getStatus()) {
            case CONFIRMED -> "DOCTOR_CONFIRM_APPOINTMENT";
            case CANCELLED -> "DOCTOR_CANCEL_APPOINTMENT";
            case COMPLETED -> "DOCTOR_COMPLETE_APPOINTMENT";
            default -> "DOCTOR_UPDATE_APPOINTMENT";
        };
        auditLogService.log(doctor.getUserId(), action, "Appointment", appointmentId);

        return mapAppointment(appointment, false);
    }

    @Transactional(readOnly = true)
    public DoctorScheduleResponse getSchedule(String email) {
        Doctor doctor = requireDoctorByEmail(email);
        return doctorScheduleRepository.findByDoctorId(doctor.getId())
                .map(this::mapSchedule)
                .orElse(DoctorScheduleResponse.builder()
                        .doctorId(doctor.getId())
                        .days(List.of())
                        .slotDurationMinutes(30)
                        .build());
    }

    @Transactional
    public DoctorScheduleResponse updateSchedule(String email, DoctorScheduleRequest request) {
        Doctor doctor = requireDoctorByEmail(email);

        List<DaySchedule> days = request.getDays().stream()
                .map(dto -> DaySchedule.builder()
                        .dayOfWeek(dto.getDayOfWeek())
                        .enabled(dto.isEnabled())
                        .startTime(dto.getStartTime())
                        .endTime(dto.getEndTime())
                        .build())
                .collect(Collectors.toList());

        DoctorSchedule schedule = doctorScheduleRepository.findByDoctorId(doctor.getId())
                .orElse(DoctorSchedule.builder().doctorId(doctor.getId()).build());
        schedule.setDays(days);
        schedule.setSlotDurationMinutes(request.getSlotDurationMinutes());
        schedule.prepareForPersist();
        doctorScheduleRepository.save(schedule);

        auditLogService.log(doctor.getUserId(), "DOCTOR_UPDATE_SCHEDULE", "DoctorSchedule", schedule.getId());
        return mapSchedule(schedule);
    }

    @Transactional
    public DoctorPortalResponse setAvailability(String email, DoctorAvailabilityRequest request) {
        Doctor doctor = requireDoctorByEmail(email);
        if (!doctor.isVerifiedByAdmin()) {
            throw new BadRequestException("Your account must be verified by admin before changing availability");
        }
        doctor.setAvailable(request.isAvailable());
        doctor.touchUpdatedAt();
        doctorRepository.save(doctor);
        auditLogService.log(doctor.getUserId(), "DOCTOR_SET_AVAILABILITY", "Doctor", doctor.getId());
        return mapDoctor(doctor);
    }

    @Transactional
    public DoctorPortalResponse updateProfile(String email, DoctorProfileUpdateRequest request) {
        Doctor doctor = requireDoctorByEmail(email);
        if (request.getSpecialization() != null) {
            doctor.setSpecialization(request.getSpecialization());
        }
        if (request.getHospital() != null) {
            doctor.setHospital(request.getHospital());
        }
        doctor.touchUpdatedAt();
        doctorRepository.save(doctor);
        auditLogService.log(doctor.getUserId(), "DOCTOR_UPDATE_PROFILE", "Doctor", doctor.getId());
        return mapDoctor(doctor);
    }

    private Doctor requireDoctorByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != Role.DOCTOR) {
            throw new BadRequestException("Not a doctor account");
        }
        return doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
    }

    private Appointment requireOwnedAppointment(Doctor doctor, String appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));
        if (!appointment.getDoctorId().equals(doctor.getId())) {
            throw new BadRequestException("Appointment does not belong to this doctor");
        }
        return appointment;
    }

    private void validateStatusTransition(AppointmentStatus current, AppointmentStatus next) {
        if (current == next) {
            return;
        }
        boolean allowed = switch (current) {
            case PENDING -> next == AppointmentStatus.CONFIRMED || next == AppointmentStatus.CANCELLED;
            case CONFIRMED -> next == AppointmentStatus.COMPLETED || next == AppointmentStatus.CANCELLED;
            case CANCELLED, COMPLETED -> false;
        };
        if (!allowed) {
            throw new BadRequestException("Invalid status transition from " + current + " to " + next);
        }
    }

    private DoctorPortalResponse mapDoctor(Doctor doctor) {
        User user = userRepository.findById(doctor.getUserId()).orElse(null);
        return DoctorPortalResponse.builder()
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
                .build();
    }

    private DoctorAppointmentResponse mapAppointment(Appointment appointment, boolean includeHealthSummary) {
        User patient = userRepository.findById(appointment.getPatientId()).orElse(null);
        DoctorPatientHealthSummary summary = null;
        if (includeHealthSummary && patient != null) {
            summary = healthProfileRepository.findByUserId(patient.getId())
                    .map(profile -> DoctorPatientHealthSummary.builder()
                            .gender(profile.getGender())
                            .bloodType(profile.getBloodType())
                            .bmi(profile.getBmi())
                            .birthDate(profile.getBirthDate())
                            .allergies(encryptionService.decryptOptional(profile.getAllergies()))
                            .build())
                    .orElse(null);
        }

        return DoctorAppointmentResponse.builder()
                .id(appointment.getId())
                .referenceNumber(appointment.getId().substring(0, 8).toUpperCase())
                .patientId(appointment.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientHealthId(patient != null ? patient.getHealthId() : null)
                .scheduledAt(appointment.getScheduledAt())
                .status(appointment.getStatus())
                .notes(encryptionService.decryptOptional(appointment.getNotes()))
                .healthSummary(summary)
                .createdAt(appointment.getCreatedAt())
                .build();
    }

    private DoctorScheduleResponse mapSchedule(DoctorSchedule schedule) {
        List<DayScheduleDto> days = schedule.getDays().stream()
                .map(d -> {
                    DayScheduleDto dto = new DayScheduleDto();
                    dto.setDayOfWeek(d.getDayOfWeek());
                    dto.setEnabled(d.isEnabled());
                    dto.setStartTime(d.getStartTime());
                    dto.setEndTime(d.getEndTime());
                    return dto;
                })
                .collect(Collectors.toList());

        return DoctorScheduleResponse.builder()
                .doctorId(schedule.getDoctorId())
                .days(days)
                .slotDurationMinutes(schedule.getSlotDurationMinutes())
                .updatedAt(schedule.getUpdatedAt())
                .build();
    }
}
