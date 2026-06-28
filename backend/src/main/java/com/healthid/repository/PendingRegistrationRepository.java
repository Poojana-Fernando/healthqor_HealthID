package com.healthid.repository;

import com.healthid.entity.PendingRegistration;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PendingRegistrationRepository extends MongoRepository<PendingRegistration, String> {

    Optional<PendingRegistration> findByEmail(String email);

    boolean existsByEmailAndExpiresAtAfter(String email, Instant now);

    void deleteByEmail(String email);
}
