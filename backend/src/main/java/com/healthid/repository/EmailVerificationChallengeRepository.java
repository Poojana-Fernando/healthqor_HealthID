package com.healthid.repository;

import com.healthid.entity.EmailVerificationChallenge;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface EmailVerificationChallengeRepository extends MongoRepository<EmailVerificationChallenge, String> {

    Optional<EmailVerificationChallenge> findByIdAndConsumedAtIsNull(String id);

    long countByEmailAndCreatedAtAfter(String email, Instant since);
}
