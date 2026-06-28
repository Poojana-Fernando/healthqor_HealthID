package com.healthid.integration;

import com.healthid.entity.Doctor;
import com.healthid.repository.DoctorQueryRepository;
import com.healthid.repository.DoctorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class DoctorQueryRepositoryTest {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private DoctorQueryRepository doctorQueryRepository;

    @BeforeEach
    void seedDoctors() {
        doctorRepository.deleteAll();
        doctorRepository.save(Doctor.builder()
                .userId("user-cardio")
                .specialization("Cardiology")
                .hospital("Colombo General")
                .licenseNumber("LIC-001")
                .lat(BigDecimal.valueOf(6.9271))
                .lng(BigDecimal.valueOf(79.8612))
                .avgRating(BigDecimal.valueOf(4.5))
                .available(true)
                .build());
        doctorRepository.save(Doctor.builder()
                .userId("user-gp")
                .specialization("General Practice")
                .hospital("Kandy Hospital")
                .licenseNumber("LIC-002")
                .lat(BigDecimal.valueOf(7.2906))
                .lng(BigDecimal.valueOf(80.6337))
                .avgRating(BigDecimal.valueOf(4.0))
                .available(true)
                .build());
    }

    @Test
    void findNearbyReturnsDoctorsOrderedByDistance() {
        List<Doctor> nearby = doctorQueryRepository.findNearby(
                BigDecimal.valueOf(6.93),
                BigDecimal.valueOf(79.85),
                null);
        assertThat(nearby).isNotEmpty();
        assertThat(nearby.getFirst().getSpecialization()).isEqualTo("Cardiology");
    }

    @Test
    void searchFiltersBySpecialtyAndLocation() {
        List<Doctor> results = doctorQueryRepository.search("General", "Kandy", true, null);
        assertThat(results).hasSize(1);
        assertThat(results.getFirst().getHospital()).contains("Kandy");
    }
}
