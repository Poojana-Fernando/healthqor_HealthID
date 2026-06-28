package com.healthid.config;

import com.healthid.entity.Doctor;
import com.healthid.entity.MaritalStatus;
import com.healthid.entity.NameTitle;
import com.healthid.entity.User;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@Order(4)
public class DoctorProfileMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DoctorProfileMigrationRunner.class);

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    public DoctorProfileMigrationRunner(DoctorRepository doctorRepository, UserRepository userRepository) {
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Doctor> doctors = doctorRepository.findAll();
        int updated = 0;
        for (Doctor doctor : doctors) {
            if (needsMigration(doctor)) {
                migrateDoctor(doctor);
                doctorRepository.save(doctor);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Migrated {} doctor profile(s) to expanded schema", updated);
        }
    }

    private boolean needsMigration(Doctor doctor) {
        return doctor.getNameTitle() == null
                || doctor.getNic() == null
                || doctor.getExperienceYears() == null
                || doctor.getMaritalStatus() == null
                || doctor.getCreatedAt() == null;
    }

    private void migrateDoctor(Doctor doctor) {
        User user = userRepository.findById(doctor.getUserId()).orElse(null);
        if (doctor.getNameTitle() == null) {
            doctor.setNameTitle(NameTitle.DR);
        }
        if (doctor.getNic() == null && user != null) {
            doctor.setNic(user.getNationalId());
        }
        if (doctor.getExperienceYears() == null) {
            doctor.setExperienceYears(0);
        }
        if (doctor.getMaritalStatus() == null) {
            doctor.setMaritalStatus(MaritalStatus.SINGLE);
        }
        if (doctor.getEducation() == null) {
            doctor.setEducation(List.of());
        }
        if (doctor.getHospital() == null || doctor.getHospital().isBlank()) {
            doctor.setHospital("Unspecified");
        }
        Instant now = Instant.now();
        if (doctor.getCreatedAt() == null) {
            doctor.setCreatedAt(now);
        }
        if (doctor.getUpdatedAt() == null) {
            doctor.setUpdatedAt(now);
        }
        if (doctor.isAvailable() && !doctor.isVerifiedByAdmin()) {
            doctor.setVerifiedByAdmin(true);
        }
    }
}
