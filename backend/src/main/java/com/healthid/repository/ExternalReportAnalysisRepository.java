package com.healthid.repository;

import com.healthid.entity.ExternalReportAnalysis;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExternalReportAnalysisRepository extends MongoRepository<ExternalReportAnalysis, String> {

    List<ExternalReportAnalysis> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<ExternalReportAnalysis> findByIdAndUserId(String id, String userId);
}
