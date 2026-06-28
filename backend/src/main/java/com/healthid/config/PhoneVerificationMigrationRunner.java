package com.healthid.config;

import com.healthid.entity.Role;
import com.healthid.entity.User;
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
@Order(3)
public class PhoneVerificationMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PhoneVerificationMigrationRunner.class);

    private final UserRepository userRepository;

    public PhoneVerificationMigrationRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<User> admins = userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN)
                .filter(user -> !user.isPhoneVerified())
                .toList();
        if (admins.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (User admin : admins) {
            admin.setPhoneVerified(true);
            admin.setPhoneVerifiedAt(now);
            userRepository.save(admin);
        }
        log.info("Set phoneVerified for {} ADMIN user(s)", admins.size());
    }
}
