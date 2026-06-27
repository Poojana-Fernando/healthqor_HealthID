package com.healthid.repository;

import com.healthid.entity.Doctor;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends MongoRepository<Doctor, String> {

    Optional<Doctor> findByUserId(String userId);

    List<Doctor> findBySpecializationContainingIgnoreCaseAndAvailableTrue(String specialization);

    List<Doctor> findByAvailableTrueOrderByAvgRatingDesc();
}
