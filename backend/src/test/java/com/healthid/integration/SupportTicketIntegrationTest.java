package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.support.SupportTicketSubmitRequest;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import com.healthid.security.JwtFilter;
import com.healthid.service.EncryptionService;
import com.healthid.service.HealthIdGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class SupportTicketIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EncryptionService encryptionService;

    @Autowired
    private HealthIdGenerator healthIdGenerator;

    private jakarta.servlet.http.Cookie adminCookie;

    @BeforeEach
    void setUp() throws Exception {
        ensureAdminUser();
        adminCookie = loginAdmin();
    }

    @Test
    void publicCanSubmitSupportTicketAndAdminCanListIt() throws Exception {
        SupportTicketSubmitRequest request = buildTicketRequest();

        mockMvc.perform(multipart("/api/support/tickets")
                        .file(ticketPart(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketNumber").value(org.hamcrest.Matchers.startsWith("HQ-")))
                .andExpect(jsonPath("$.status").value("RECEIVED"));

        mockMvc.perform(get("/api/admin/support-tickets").cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].subject").value("Login issue"));
    }

    @Test
    void adminCanUpdateSupportTicketStatus() throws Exception {
        MvcResult createResult = mockMvc.perform(multipart("/api/support/tickets")
                        .file(ticketPart(buildTicketRequest()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andReturn();

        String ticketId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(patch("/api/admin/support-tickets/" + ticketId + "/status")
                        .with(csrf())
                        .cookie(adminCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void citizenCannotAccessAdminSupportTickets() throws Exception {
        mockMvc.perform(get("/api/admin/support-tickets"))
                .andExpect(status().isUnauthorized());
    }

    private SupportTicketSubmitRequest buildTicketRequest() {
        SupportTicketSubmitRequest request = new SupportTicketSubmitRequest();
        request.setName("Test User");
        request.setEmail("support.test@healthid.lk");
        request.setSubject("Login issue");
        request.setCategory("Technical Issue");
        request.setPriority("High");
        request.setMessage("I cannot log in after verification.");
        return request;
    }

    private MockMultipartFile ticketPart(SupportTicketSubmitRequest request) throws Exception {
        return new MockMultipartFile(
                "ticket",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(request));
    }

    private void ensureAdminUser() {
        if (userRepository.existsByEmail("admin-support@test.healthid.lk")) {
            return;
        }
        String healthId = healthIdGenerator.generate("LK", LocalDate.of(1990, 1, 1), "ADMIN-SUPPORT");
        User admin = User.builder()
                .name("Support Test Admin")
                .email("admin-support@test.healthid.lk")
                .passwordHash(passwordEncoder.encode("adminpass123"))
                .country("LK")
                .nationalId(encryptionService.encryptNationalId("ADMIN-SUPPORT-NIC"))
                .healthId(healthId)
                .role(Role.ADMIN)
                .verified(true)
                .emailVerifiedAt(Instant.now())
                .phoneVerified(true)
                .build();
        userRepository.save(admin);
    }

    private jakarta.servlet.http.Cookie loginAdmin() throws Exception {
        LoginRequest login = new LoginRequest();
        login.setEmail("admin-support@test.healthid.lk");
        login.setPassword("adminpass123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE))
                .andReturn();

        return result.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
    }
}
