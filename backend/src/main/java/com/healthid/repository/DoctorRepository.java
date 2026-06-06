package com.healthid.repository;

import com.healthid.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {

    Optional<Doctor> findByUserId(String userId);

    List<Doctor> findBySpecializationContainingIgnoreCaseAndAvailableTrue(String specialization);

    @Query("""
            SELECT d FROM Doctor d
            WHERE d.available = true
            AND (:specialty IS NULL OR LOWER(d.specialization) LIKE LOWER(CONCAT('%', :specialty, '%')))
            AND d.lat IS NOT NULL AND d.lng IS NOT NULL
            ORDER BY (POWER(d.lat - :lat, 2) + POWER(d.lng - :lng, 2)) ASC
            """)
    List<Doctor> findNearby(
            @Param("lat") BigDecimal lat,
            @Param("lng") BigDecimal lng,
            @Param("specialty") String specialty);

    List<Doctor> findByAvailableTrueOrderByAvgRatingDesc();

    @Query("""
            SELECT d FROM Doctor d
            WHERE (:specialty IS NULL OR LOWER(d.specialization) LIKE LOWER(CONCAT('%', :specialty, '%')))
            AND (:location IS NULL OR LOWER(d.hospital) LIKE LOWER(CONCAT('%', :location, '%')))
            AND (:available IS NULL OR d.available = :available)
            AND (:minRating IS NULL OR d.avgRating >= :minRating)
            ORDER BY d.avgRating DESC
            """)
    List<Doctor> search(
            @Param("specialty") String specialty,
            @Param("location") String location,
            @Param("available") Boolean available,
            @Param("minRating") BigDecimal minRating);
}
