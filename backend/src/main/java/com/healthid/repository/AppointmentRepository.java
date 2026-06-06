package com.healthid.repository;

import com.healthid.entity.Appointment;
import com.healthid.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    List<Appointment> findByPatientIdOrderByScheduledAtDesc(String patientId);

    long countByScheduledAtBetween(Instant start, Instant end);
}
