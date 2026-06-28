package com.healthid.repository;

import com.healthid.entity.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends MongoRepository<Doctor, String> {

    Optional<Doctor> findByUserId(String userId);

    boolean existsByLicenseNumber(String licenseNumber);

    long countByVerifiedByAdmin(boolean verifiedByAdmin);

    long countByDeactivatedAtIsNullAndVerifiedByAdmin(boolean verifiedByAdmin);

    Page<Doctor> findByDeactivatedAtIsNull(Pageable pageable);

    @Query("""
            {
              deactivatedAt: null,
              $or: [
                { specialization: { $regex: ?0, $options: 'i' } },
                { hospital: { $regex: ?0, $options: 'i' } },
                { licenseNumber: { $regex: ?0, $options: 'i' } }
              ]
            }
            """)
    Page<Doctor> searchActiveDoctors(String search, Pageable pageable);

    Page<Doctor> findByDeactivatedAtIsNullAndVerifiedByAdmin(boolean verifiedByAdmin, Pageable pageable);

    Page<Doctor> findByDeactivatedAtIsNullAndSpecializationContainingIgnoreCase(
            String specialization, Pageable pageable);

    List<Doctor> findBySpecializationContainingIgnoreCaseAndAvailableTrue(String specialization);

    List<Doctor> findByAvailableTrueOrderByAvgRatingDesc();
}
