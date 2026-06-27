package com.healthid.config;

import com.healthid.entity.Gender;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import com.healthid.service.AuditLogService;
import com.healthid.service.EncryptionService;
import com.healthid.service.HealthIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@Order(1)
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final EncryptionService encryptionService;
    private final HealthIdGenerator healthIdGenerator;
    private final AuditLogService auditLogService;

    @Value("${admin.bootstrap.email:}")
    private String adminEmail;

    @Value("${admin.bootstrap.password:}")
    private String adminPassword;

    @Value("${admin.bootstrap.name:System Admin}")
    private String adminName;

    public AdminBootstrapRunner(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            PasswordEncoder passwordEncoder,
            EncryptionService encryptionService,
            HealthIdGenerator healthIdGenerator,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.encryptionService = encryptionService;
        this.healthIdGenerator = healthIdGenerator;
        this.auditLogService = auditLogService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(Role.ADMIN)) {
            return;
        }
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("No ADMIN user exists and admin.bootstrap.email/password are not set — skipping admin bootstrap");
            return;
        }
        if (userRepository.existsByEmail(adminEmail)) {
            log.warn("Admin bootstrap skipped: {} already exists", adminEmail);
            return;
        }

        LocalDate birthDate = LocalDate.of(1990, 1, 1);
        String placeholderNationalId = "ADMIN-BOOTSTRAP";
        String healthId = healthIdGenerator.generate("LK", birthDate, placeholderNationalId);
        while (userRepository.existsByHealthId(healthId)) {
            healthId = healthIdGenerator.generate("LK", birthDate, placeholderNationalId);
        }

        User admin = User.builder()
                .name(adminName)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .country("LK")
                .nationalId(encryptionService.encryptNationalId(placeholderNationalId))
                .healthId(healthId)
                .role(Role.ADMIN)
                .verified(true)
                .build();
        userRepository.save(admin);

        HealthProfile profile = HealthProfile.builder()
                .userId(admin.getId())
                .gender(Gender.MALE)
                .birthDate(birthDate)
                .build();
        healthProfileRepository.save(profile);

        auditLogService.log(admin.getId(), "ADMIN_BOOTSTRAP", "User", admin.getId());
        log.info("Bootstrapped initial ADMIN user: {}", adminEmail);
    }
}
