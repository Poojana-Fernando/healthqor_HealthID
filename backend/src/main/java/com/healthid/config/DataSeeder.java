package com.healthid.config;

import com.healthid.entity.*;
import com.healthid.repository.*;
import com.healthid.service.EncryptionService;
import com.healthid.service.HealthIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Component
@Profile({"h2", "dev"})
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String SEED_PASSWORD = "Password123!";

    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final EncryptionService encryptionService;
    private final HealthIdGenerator healthIdGenerator;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    public DataSeeder(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            PasswordEncoder passwordEncoder,
            EncryptionService encryptionService,
            HealthIdGenerator healthIdGenerator) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.encryptionService = encryptionService;
        this.healthIdGenerator = healthIdGenerator;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedEnabled || userRepository.existsByEmail("admin@healthid.test")) {
            return;
        }
        log.info("Seeding demo users for local development...");

        User admin = saveUser("Admin User", "admin@healthid.test", Role.ADMIN,
                "199011111111", LocalDate.of(1990, 1, 1), true);
        User patient = saveUser("Demo Patient", "patient@healthid.test", Role.CITIZEN,
                "199022222222", LocalDate.of(1992, 5, 15), true);
        User doctorUser = saveUser("Dr. Verified", "doctor@healthid.test", Role.DOCTOR,
                "198033333333", LocalDate.of(1985, 3, 20), true);
        User doctorPending = saveUser("Dr. Pending", "doctor2@healthid.test", Role.DOCTOR,
                "198044444444", LocalDate.of(1988, 7, 10), false);

        saveProfile(patient.getId(), Gender.FEMALE, "O+", BigDecimal.valueOf(165), BigDecimal.valueOf(58),
                LocalDate.of(1992, 5, 15));

        Doctor verifiedDoctor = Doctor.builder()
                .userId(doctorUser.getId())
                .specialization("General Medicine")
                .hospital("National Hospital Colombo")
                .licenseNumber("SLMC-10001")
                .lat(BigDecimal.valueOf(6.9271))
                .lng(BigDecimal.valueOf(79.8612))
                .avgRating(BigDecimal.valueOf(4.5))
                .available(true)
                .build();
        doctorRepository.save(verifiedDoctor);

        Doctor pendingDoctor = Doctor.builder()
                .userId(doctorPending.getId())
                .specialization("Cardiology")
                .hospital("Asiri Hospital")
                .licenseNumber("SLMC-10002")
                .available(false)
                .build();
        doctorRepository.save(pendingDoctor);

        Instant tomorrow = Instant.now().plus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS);
        appointmentRepository.save(Appointment.builder()
                .patientId(patient.getId())
                .doctorId(verifiedDoctor.getId())
                .scheduledAt(tomorrow)
                .status(AppointmentStatus.CONFIRMED)
                .notes("Annual checkup")
                .build());
        appointmentRepository.save(Appointment.builder()
                .patientId(patient.getId())
                .doctorId(verifiedDoctor.getId())
                .scheduledAt(tomorrow.plus(2, ChronoUnit.DAYS))
                .status(AppointmentStatus.PENDING)
                .notes("Follow-up visit")
                .build());

        log.info("Seed complete. Demo password for all accounts: {}", SEED_PASSWORD);
    }

    private User saveUser(String name, String email, Role role, String nationalId, LocalDate birthDate, boolean verified) {
        String healthId = healthIdGenerator.generate("LK", birthDate, nationalId);
        while (userRepository.existsByHealthId(healthId)) {
            healthId = healthIdGenerator.generate("LK", birthDate, nationalId);
        }
        User user = User.builder()
                .name(name)
                .email(email)
                .passwordHash(passwordEncoder.encode(SEED_PASSWORD))
                .country("LK")
                .nationalId(encryptionService.encryptNationalId(nationalId))
                .healthId(healthId)
                .role(role)
                .verified(verified)
                .build();
        return userRepository.save(user);
    }

    private void saveProfile(String userId, Gender gender, String bloodType,
                             BigDecimal heightCm, BigDecimal weightKg, LocalDate birthDate) {
        BigDecimal heightM = heightCm.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP);
        BigDecimal bmi = weightKg.divide(heightM.multiply(heightM), 2, java.math.RoundingMode.HALF_UP);
        healthProfileRepository.save(HealthProfile.builder()
                .userId(userId)
                .gender(gender)
                .bloodType(bloodType)
                .heightCm(heightCm)
                .weightKg(weightKg)
                .bmi(bmi)
                .birthDate(birthDate)
                .build());
    }
}
