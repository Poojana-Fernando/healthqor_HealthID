package com.healthid.config;

import com.healthid.entity.MedicalHistory;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.entity.Vaccination;
import com.healthid.repository.MedicalHistoryRepository;
import com.healthid.repository.UserRepository;
import com.healthid.repository.VaccinationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@Order(5)
public class PatientHealthDataSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PatientHealthDataSeedRunner.class);

    private final UserRepository userRepository;
    private final VaccinationRepository vaccinationRepository;
    private final MedicalHistoryRepository medicalHistoryRepository;

    @Value("${health.seed.patient-data.enabled:false}")
    private boolean enabled;

    public PatientHealthDataSeedRunner(
            UserRepository userRepository,
            VaccinationRepository vaccinationRepository,
            MedicalHistoryRepository medicalHistoryRepository) {
        this.userRepository = userRepository;
        this.vaccinationRepository = vaccinationRepository;
        this.medicalHistoryRepository = medicalHistoryRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        List<User> patients = userRepository.findByRole(Role.CITIZEN, Pageable.unpaged()).getContent();
        int seeded = 0;

        for (User patient : patients) {
            if (hasExistingHealthData(patient.getId())) {
                continue;
            }
            seedPatientData(patient.getId());
            seeded++;
        }

        if (seeded > 0) {
            log.info("Seeded vaccinations and medical history for {} patient(s)", seeded);
        }
    }

    private boolean hasExistingHealthData(String userId) {
        return !vaccinationRepository.findByUserIdOrderByDateAdministeredDesc(userId).isEmpty()
                || !medicalHistoryRepository.findByUserIdOrderByDiagnosedDateDesc(userId).isEmpty();
    }

    private void seedPatientData(String userId) {
        vaccinationRepository.saveAll(List.of(
                Vaccination.builder()
                        .userId(userId)
                        .vaccineName("COVID-19 (Pfizer)")
                        .doseNumber(2)
                        .dateAdministered(LocalDate.of(2023, 6, 15))
                        .nextDueDate(LocalDate.of(2025, 6, 15))
                        .administeredBy("National Vaccination Centre, Colombo")
                        .build(),
                Vaccination.builder()
                        .userId(userId)
                        .vaccineName("Tetanus")
                        .doseNumber(1)
                        .dateAdministered(LocalDate.of(2022, 1, 10))
                        .administeredBy("District Hospital")
                        .build(),
                Vaccination.builder()
                        .userId(userId)
                        .vaccineName("Hepatitis B")
                        .doseNumber(3)
                        .dateAdministered(LocalDate.of(2021, 8, 20))
                        .administeredBy("MOH Office")
                        .build()
        ));

        medicalHistoryRepository.saveAll(List.of(
                MedicalHistory.builder()
                        .userId(userId)
                        .conditionName("Seasonal Allergies")
                        .diagnosedDate(LocalDate.of(2024, 3, 12))
                        .build(),
                MedicalHistory.builder()
                        .userId(userId)
                        .conditionName("Mild Hypertension")
                        .diagnosedDate(LocalDate.of(2023, 11, 5))
                        .build(),
                MedicalHistory.builder()
                        .userId(userId)
                        .conditionName("Chickenpox")
                        .diagnosedDate(LocalDate.of(2010, 5, 1))
                        .resolvedDate(LocalDate.of(2010, 5, 20))
                        .build(),
                MedicalHistory.builder()
                        .userId(userId)
                        .conditionName("Dengue Fever")
                        .diagnosedDate(LocalDate.of(2019, 7, 14))
                        .resolvedDate(LocalDate.of(2019, 8, 2))
                        .build()
        ));
    }
}
