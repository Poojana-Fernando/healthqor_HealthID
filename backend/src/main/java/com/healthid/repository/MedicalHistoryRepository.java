package com.healthid.repository;

import com.healthid.entity.MedicalHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalHistoryRepository extends MongoRepository<MedicalHistory, String> {

    List<MedicalHistory> findByUserIdOrderByDiagnosedDateDesc(String userId);

    void deleteByUserId(String userId);
}
