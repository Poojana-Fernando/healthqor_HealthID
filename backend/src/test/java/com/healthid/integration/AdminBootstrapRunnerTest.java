package com.healthid.integration;

import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
@TestPropertySource(properties = {
        "admin.bootstrap.email=admin-bootstrap@healthid.lk",
        "admin.bootstrap.password=adminpassword123",
        "admin.bootstrap.name=Bootstrap Admin"
})
class AdminBootstrapRunnerTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void createsAdminOnceOnStartup() {
        User admin = userRepository.findByEmail("admin-bootstrap@healthid.lk").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.isVerified()).isTrue();
        assertThat(userRepository.existsByRole(Role.ADMIN)).isTrue();
    }
}
