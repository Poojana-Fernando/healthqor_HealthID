package com.healthid.repository;

import com.healthid.entity.Vaccination;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VaccinationRepository extends MongoRepository<Vaccination, String> {

    List<Vaccination> findByUserIdOrderByDateAdministeredDesc(String userId);
}
