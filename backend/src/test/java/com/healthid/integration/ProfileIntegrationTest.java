package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.security.JwtFilter;
import com.healthid.security.JwtUtil;
import com.healthid.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private String accessToken;
    private String uniqueEmail;

    @BeforeEach
    void setUp() throws Exception {
        uniqueEmail = "profile-" + System.nanoTime() + "@healthid.lk";
        RegisterRequest register = new RegisterRequest();
        register.setName("Profile User");
        register.setEmail(uniqueEmail);
        register.setPassword("password123");
        register.setNationalId("199098765432");
        register.setCountry("LK");
        register.setBirthDate(LocalDate.of(1990, 6, 1));
        register.setHeightCm(BigDecimal.valueOf(180));
        register.setWeightKg(BigDecimal.valueOf(75));

        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String userId = objectMapper.readTree(response).get("userId").asText();
        accessToken = jwtUtil.generateAccessToken(userId, uniqueEmail, Role.CITIZEN);
    }

    @Test
    void getProfileWithJwt() throws Exception {
        mockMvc.perform(get("/api/profile/me")
                        .cookie(new jakarta.servlet.http.Cookie(JwtFilter.ACCESS_TOKEN_COOKIE, accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.healthId").value(org.hamcrest.Matchers.startsWith("HID-LK-1990-")))
                .andExpect(jsonPath("$.name").value("Profile User"));
    }

    @Test
    void invalidProfileUpdateReturnsFieldErrors() throws Exception {
        String body = "{\"name\":\"\"}";
        mockMvc.perform(put("/api/profile/me")
                        .cookie(new jakarta.servlet.http.Cookie(JwtFilter.ACCESS_TOKEN_COOKIE, accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists());
    }
}
