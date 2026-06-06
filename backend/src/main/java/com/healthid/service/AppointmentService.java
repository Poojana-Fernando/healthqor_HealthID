package com.healthid.service;

import com.healthid.dto.appointment.AppointmentRequest;
import com.healthid.dto.appointment.AppointmentResponse;
import com.healthid.entity.Appointment;
import com.healthid.entity.AppointmentStatus;
import com.healthid.entity.Doctor;
import com.healthid.entity.User;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.AppointmentRepository;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.UserRepository;
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
                .createdAt(appointment.getCreatedAt())
                .build();
    }
}
