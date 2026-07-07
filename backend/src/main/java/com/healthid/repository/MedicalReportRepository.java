package com.healthid.repository;

import com.healthid.entity.MedicalReport;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MedicalReportRepository extends MongoRepository<MedicalReport, String> {

    List<MedicalReport> findByPatientIdOrderByVisitDateDesc(String patientId);

    Optional<MedicalReport> findByAppointmentId(String appointmentId);

    boolean existsByAppointmentId(String appointmentId);
}
