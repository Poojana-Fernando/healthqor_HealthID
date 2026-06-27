package com.healthid.service;

import com.healthid.dto.appointment.AppointmentRequest;
import com.healthid.dto.appointment.AppointmentResponse;
import com.healthid.dto.appointment.AppointmentUpdateRequest;
import com.healthid.entity.Appointment;
import com.healthid.entity.AppointmentStatus;
import com.healthid.entity.Doctor;
import com.healthid.entity.User;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.AppointmentRepository;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            DoctorRepository doctorRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AppointmentResponse bookAppointment(String email, AppointmentRequest request) {
        User patient = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        Appointment appointment = Appointment.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .scheduledAt(request.getScheduledAt())
                .status(AppointmentStatus.PENDING)
                .notes(request.getNotes())
                .build();
        appointmentRepository.save(appointment);

        auditLogService.log(patient.getId(), "CREATE", "Appointment", appointment.getId());
        return mapAppointment(appointment, doctor);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getMyAppointments(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        auditLogService.log(user.getId(), "READ", "Appointment", user.getId());
        return appointmentRepository.findByPatientIdOrderByScheduledAtDesc(user.getId())
                .stream()
                .map(a -> {
                    Doctor doctor = doctorRepository.findById(a.getDoctorId()).orElse(null);
                    return mapAppointment(a, doctor);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public AppointmentResponse getAppointment(String email, String appointmentId) {
        User user = requireUser(email);
        Appointment appointment = requireOwnedAppointment(user, appointmentId);
        Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        auditLogService.log(user.getId(), "READ", "Appointment", appointment.getId());
        return mapAppointment(appointment, doctor);
    }

    @Transactional
    public AppointmentResponse updateAppointment(String email, String appointmentId, AppointmentUpdateRequest request) {
        User user = requireUser(email);
        Appointment appointment = requireOwnedAppointment(user, appointmentId);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot update a " + appointment.getStatus().name().toLowerCase() + " appointment");
        }
        if (request.getScheduledAt() != null) {
            appointment.setScheduledAt(request.getScheduledAt());
        }
        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes());
        }
        appointmentRepository.save(appointment);
        auditLogService.log(user.getId(), "UPDATE", "Appointment", appointment.getId());
        Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        return mapAppointment(appointment, doctor);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(String email, String appointmentId) {
        User user = requireUser(email);
        Appointment appointment = requireOwnedAppointment(user, appointmentId);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Appointment is already cancelled");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel a completed appointment");
        }
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointmentRepository.save(appointment);
        auditLogService.log(user.getId(), "DELETE", "Appointment", appointment.getId());
        Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        return mapAppointment(appointment, doctor);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Appointment requireOwnedAppointment(User user, String appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));
        if (!appointment.getPatientId().equals(user.getId())) {
            throw new AccessDeniedException("Not authorized to access this appointment");
        }
        return appointment;
    }

    private AppointmentResponse mapAppointment(Appointment appointment, Doctor doctor) {
        User doctorUser = doctor != null ? userRepository.findById(doctor.getUserId()).orElse(null) : null;
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .referenceNumber(appointment.getId().substring(0, 8).toUpperCase())
                .doctorId(appointment.getDoctorId())
                .doctorName(doctorUser != null ? doctorUser.getName() : "Unknown")
                .specialization(doctor != null ? doctor.getSpecialization() : null)
                .hospital(doctor != null ? doctor.getHospital() : null)
                .scheduledAt(appointment.getScheduledAt())
                .status(appointment.getStatus())
                .notes(appointment.getNotes())
                .createdAt(appointment.getCreatedAt())
                .build();
    }
}
