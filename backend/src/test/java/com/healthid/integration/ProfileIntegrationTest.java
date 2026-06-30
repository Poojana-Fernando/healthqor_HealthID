package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.security.JwtFilter;
import com.healthid.service.email.CapturedEmailStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class ProfileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CapturedEmailStore capturedEmailStore;

    private jakarta.servlet.http.Cookie accessCookie;

    @BeforeEach
    void setUp() throws Exception {
        capturedEmailStore.clear();

        RegisterRequest register = new RegisterRequest();
        register.setName("Profile User");
        register.setEmail("profile@healthid.lk");
        register.setPassword("password123");
        register.setNationalId("199098765432");
        register.setCountry("LK");
        register.setMobile("+94771234567");
        register.setBirthDate(LocalDate.of(1990, 6, 1));
        register.setBloodType("O+");
        register.setHeightCm(BigDecimal.valueOf(180));
        register.setWeightKg(BigDecimal.valueOf(75));

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andReturn();

        String challengeId = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("challengeId").asText();

        VerifyEmailRequest verify = new VerifyEmailRequest();
        verify.setChallengeId(challengeId);
        verify.setCode(capturedEmailStore.getLast().otpCode());

        MvcResult verifyResult = mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE))
                .andReturn();

        accessCookie = verifyResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
    }

    @Test
    void getProfileWithJwt() throws Exception {
        mockMvc.perform(get("/api/profile/me").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.healthId").value(org.hamcrest.Matchers.startsWith("HID-LK-1990-")))
                .andExpect(jsonPath("$.name").value("Profile User"))
                .andExpect(jsonPath("$.phoneVerified").value(false));
    }
}
