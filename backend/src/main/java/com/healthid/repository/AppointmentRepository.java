package com.healthid.repository;

import com.healthid.entity.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {

    List<Appointment> findByPatientIdOrderByScheduledAtDesc(String patientId);

    long countByScheduledAtBetween(Instant start, Instant end);
}
