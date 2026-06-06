package com.healthid.repository;

import com.healthid.entity.MedicalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalHistoryRepository extends JpaRepository<MedicalHistory, String> {

    List<MedicalHistory> findByUserIdOrderByDiagnosedDateDesc(String userId);
}
