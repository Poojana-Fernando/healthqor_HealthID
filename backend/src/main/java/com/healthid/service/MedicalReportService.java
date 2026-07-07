package com.healthid.service;

import com.healthid.dto.medicalreport.*;
import com.healthid.entity.*;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MedicalReportService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalReportRepository medicalReportRepository;
    private final AuditLogService auditLogService;
    private final EncryptionService encryptionService;

    public MedicalReportService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            MedicalReportRepository medicalReportRepository,
            AuditLogService auditLogService,
            EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicalReportRepository = medicalReportRepository;
        this.auditLogService = auditLogService;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public DoctorReportResponse submitReport(String doctorEmail, String appointmentId, SubmitPatientReportRequest request) {
        Doctor doctor = requireDoctorByEmail(doctorEmail);
        Appointment appointment = requireOwnedAppointment(doctor, appointmentId);

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new BadRequestException("Only confirmed appointments can be completed with a report");
        }
        if (medicalReportRepository.existsByAppointmentId(appointmentId)) {
            throw new BadRequestException("A report already exists for this appointment");
        }

        List<PrescriptionItem> prescriptions = request.getPrescriptions() == null
                ? List.of()
                : request.getPrescriptions().stream()
                        .map(dto -> PrescriptionItem.builder()
                                .medicationName(dto.getMedicationName())
                                .dosage(dto.getDosage())
                                .frequency(dto.getFrequency())
                                .durationDays(dto.getDurationDays())
                                .build())
                        .collect(Collectors.toList());

        MedicalReport report = MedicalReport.builder()
                .appointmentId(appointmentId)
                .patientId(appointment.getPatientId())
                .doctorId(doctor.getId())
                .diagnosisSummary(encryptionService.encryptOptional(request.getDiagnosisSummary()))
                .doctorPrivateNotes(encryptionService.encryptOptional(request.getDoctorPrivateNotes()))
                .prescriptions(new ArrayList<>(prescriptions))
                .followUpDate(request.getFollowUpDate())
                .visitDate(appointment.getScheduledAt())
                .build();
        report.prepareForPersist();
        medicalReportRepository.save(report);

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);

        auditLogService.log(doctor.getUserId(), "DOCTOR_SUBMIT_PATIENT_REPORT", "MedicalReport", report.getId());
        auditLogService.log(doctor.getUserId(), "DOCTOR_COMPLETE_APPOINTMENT", "Appointment", appointmentId);

        return mapDoctorReport(report, appointment);
    }

    @Transactional(readOnly = true)
    public List<PatientReportResponse> getMyReports(String patientEmail) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        auditLogService.log(patient.getId(), "READ", "MedicalReport", patient.getId());
        return medicalReportRepository.findByPatientIdOrderByVisitDateDesc(patient.getId()).stream()
                .map(this::mapPatientReport)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivePrescriptionResponse> getActivePrescriptions(String patientEmail) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<ActivePrescriptionResponse> all = new ArrayList<>();

        for (MedicalReport report : medicalReportRepository.findByPatientIdOrderByVisitDateDesc(patient.getId())) {
            Doctor doctor = doctorRepository.findById(report.getDoctorId()).orElse(null);
            User doctorUser = doctor != null
                    ? userRepository.findById(doctor.getUserId()).orElse(null)
                    : null;
            String doctorName = doctorUser != null ? doctorUser.getName() : "Unknown";

            if (report.getPrescriptions() == null) {
                continue;
            }
            for (PrescriptionItem item : report.getPrescriptions()) {
                LocalDate expiresOn = null;
                boolean active = true;
                if (item.getDurationDays() != null && item.getDurationDays() > 0 && report.getCreatedAt() != null) {
                    expiresOn = report.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().plusDays(item.getDurationDays());
                    active = !expiresOn.isBefore(today);
                }
                all.add(ActivePrescriptionResponse.builder()
                        .reportId(report.getId())
                        .doctorName(doctorName)
                        .visitDate(report.getVisitDate())
                        .prescription(item)
                        .expiresOn(expiresOn)
                        .active(active)
                        .build());
            }
        }
        return all.stream()
                .filter(ActivePrescriptionResponse::isActive)
                .sorted(Comparator.comparing(ActivePrescriptionResponse::getVisitDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivePrescriptionResponse> getAllPrescriptions(String patientEmail) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<ActivePrescriptionResponse> all = new ArrayList<>();

        for (MedicalReport report : medicalReportRepository.findByPatientIdOrderByVisitDateDesc(patient.getId())) {
            Doctor doctor = doctorRepository.findById(report.getDoctorId()).orElse(null);
            User doctorUser = doctor != null
                    ? userRepository.findById(doctor.getUserId()).orElse(null)
                    : null;
            String doctorName = doctorUser != null ? doctorUser.getName() : "Unknown";

            if (report.getPrescriptions() == null) {
                continue;
            }
            for (PrescriptionItem item : report.getPrescriptions()) {
                LocalDate expiresOn = null;
                boolean active = true;
                if (item.getDurationDays() != null && item.getDurationDays() > 0 && report.getCreatedAt() != null) {
                    expiresOn = report.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().plusDays(item.getDurationDays());
                    active = !expiresOn.isBefore(today);
                }
                all.add(ActivePrescriptionResponse.builder()
                        .reportId(report.getId())
                        .doctorName(doctorName)
                        .visitDate(report.getVisitDate())
                        .prescription(item)
                        .expiresOn(expiresOn)
                        .active(active)
                        .build());
            }
        }
        return all;
    }

    private Doctor requireDoctorByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
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

    private PatientReportResponse mapPatientReport(MedicalReport report) {
        Doctor doctor = doctorRepository.findById(report.getDoctorId()).orElse(null);
        User doctorUser = doctor != null
                ? userRepository.findById(doctor.getUserId()).orElse(null)
                : null;
        return PatientReportResponse.builder()
                .id(report.getId())
                .appointmentId(report.getAppointmentId())
                .doctorName(doctorUser != null ? doctorUser.getName() : "Unknown")
                .specialization(doctor != null ? doctor.getSpecialization() : null)
                .hospital(doctor != null ? doctor.getHospital() : null)
                .visitDate(report.getVisitDate())
                .diagnosisSummary(encryptionService.decryptOptional(report.getDiagnosisSummary()))
                .prescriptions(report.getPrescriptions())
                .followUpDate(report.getFollowUpDate())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private DoctorReportResponse mapDoctorReport(MedicalReport report, Appointment appointment) {
        User patient = userRepository.findById(appointment.getPatientId()).orElse(null);
        return DoctorReportResponse.builder()
                .id(report.getId())
                .appointmentId(report.getAppointmentId())
                .patientId(report.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .visitDate(report.getVisitDate())
                .diagnosisSummary(encryptionService.decryptOptional(report.getDiagnosisSummary()))
                .doctorPrivateNotes(encryptionService.decryptOptional(report.getDoctorPrivateNotes()))
                .prescriptions(report.getPrescriptions())
                .followUpDate(report.getFollowUpDate())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
