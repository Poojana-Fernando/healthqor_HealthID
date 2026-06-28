package com.healthid.repository;

import com.healthid.entity.HealthProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HealthProfileRepository extends MongoRepository<HealthProfile, String> {

    Optional<HealthProfile> findByUserId(String userId);

    void deleteByUserId(String userId);
}
