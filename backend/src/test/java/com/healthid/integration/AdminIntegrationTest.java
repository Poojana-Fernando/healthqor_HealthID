package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import com.healthid.security.JwtFilter;
import com.healthid.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private jakarta.servlet.http.Cookie citizenCookie;
    private jakarta.servlet.http.Cookie adminCookie;

    @BeforeEach
    void setUp() throws Exception {
        RegisterRequest citizen = new RegisterRequest();
        citizen.setName("Citizen User");
        citizen.setEmail("citizen-admin-" + System.nanoTime() + "@healthid.lk");
        citizen.setPassword("password123");
        citizen.setNationalId("199066666666");
        citizen.setCountry("LK");
        citizen.setBirthDate(LocalDate.of(1991, 2, 2));

        MvcResult citizenResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(citizen)))
                .andExpect(status().isOk())
                .andReturn();
        citizenCookie = citizenResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);

        User admin = User.builder()
                .name("Admin User")
                .email("admin-test-" + System.nanoTime() + "@healthid.lk")
                .passwordHash(passwordEncoder.encode("password123"))
                .country("LK")
                .nationalId(new byte[]{9, 9, 9})
                .healthId("HID-LK-1985-ADMIN-" + System.nanoTime())
                .role(Role.ADMIN)
                .verified(true)
                .build();
        admin = userRepository.save(admin);
        String adminToken = jwtUtil.generateAccessToken(admin.getId(), admin.getEmail(), Role.ADMIN);
        adminCookie = new jakarta.servlet.http.Cookie(JwtFilter.ACCESS_TOKEN_COOKIE, adminToken);
    }

    @Test
    void citizenCannotAccessAdminUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .cookie(citizenCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanListPaginatedUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users?page=0&size=10&sort=createdAt,desc")
                        .cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber());
    }
}
