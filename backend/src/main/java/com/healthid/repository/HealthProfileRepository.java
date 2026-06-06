package com.healthid.repository;

import com.healthid.entity.HealthProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HealthProfileRepository extends JpaRepository<HealthProfile, String> {

    Optional<HealthProfile> findByUserId(String userId);
}
