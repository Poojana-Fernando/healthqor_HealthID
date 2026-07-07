package com.healthid.repository;

import com.healthid.entity.VitalsSnapshot;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VitalsSnapshotRepository extends MongoRepository<VitalsSnapshot, String> {

    List<VitalsSnapshot> findByUserIdOrderByRecordedAtAsc(String userId);
}
