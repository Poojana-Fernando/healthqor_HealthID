package com.healthid.repository;

import com.healthid.entity.PhoneVerificationChallenge;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PhoneVerificationChallengeRepository extends MongoRepository<PhoneVerificationChallenge, String> {

    Optional<PhoneVerificationChallenge> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(String userId);

    List<PhoneVerificationChallenge> findAllByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(String userId);

    void deleteByUserIdAndConsumedAtIsNull(String userId);

    long countByUserIdAndCreatedAtAfter(String userId, Instant since);
}
