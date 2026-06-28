package com.healthid.repository;

import com.healthid.entity.Appointment;
import com.healthid.entity.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {

    List<Appointment> findByPatientIdOrderByScheduledAtDesc(String patientId);

    Page<Appointment> findByPatientIdOrderByScheduledAtDesc(String patientId, Pageable pageable);

    Page<Appointment> findByDoctorIdOrderByScheduledAtDesc(String doctorId, Pageable pageable);

    long countByDoctorId(String doctorId);

    long countByScheduledAtBetween(Instant start, Instant end);

    long countByStatus(AppointmentStatus status);

    long countByStatusAndCreatedAtBetween(AppointmentStatus status, Instant start, Instant end);

    void deleteByPatientId(String patientId);
}
