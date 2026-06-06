package com.healthid.repository;

import com.healthid.entity.Vaccination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VaccinationRepository extends JpaRepository<Vaccination, String> {

    List<Vaccination> findByUserIdOrderByDateAdministeredDesc(String userId);
}
