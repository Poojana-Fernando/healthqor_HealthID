package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.dto.auth.VerifyPhoneRequest;
import com.healthid.security.JwtFilter;
import com.healthid.service.sms.CapturedSmsStore;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class PhoneVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CapturedEmailStore capturedEmailStore;

    @Autowired
    private CapturedSmsStore capturedSmsStore;

    @BeforeEach
    void clearStores() {
        capturedEmailStore.clear();
        capturedSmsStore.clear();
    }

    @Test
    void phoneVerificationAfterRegistration() throws Exception {
        jakarta.servlet.http.Cookie accessCookie = registerAndVerifyEmail("phone@healthid.lk");

        mockMvc.perform(get("/api/profile/me").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerified").value(false))
                .andExpect(jsonPath("$.mobile").value("+94771234567"));

        mockMvc.perform(post("/api/auth/send-phone-otp").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maskedMobile").exists());

        String otp = capturedSmsStore.getLast().otpCode();
        assertThat(otp).matches("\\d{6}");

        VerifyPhoneRequest verifyPhone = new VerifyPhoneRequest();
        verifyPhone.setCode(otp);

        mockMvc.perform(post("/api/auth/verify-phone")
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyPhone)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerified").value(true));

        mockMvc.perform(get("/api/profile/me").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneVerified").value(true));
    }

    @Test
    void sendPhoneOtpRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/auth/send-phone-otp"))
                .andExpect(status().isUnauthorized());
    }

    private jakarta.servlet.http.Cookie registerAndVerifyEmail(String email) throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Phone User");
        register.setEmail(email);
        register.setPassword("password123");
        register.setNationalId("199012345678");
        register.setCountry("LK");
        register.setMobile("+94771234567");
        register.setBirthDate(LocalDate.of(1990, 1, 15));
        register.setBloodType("O+");
        register.setHeightCm(BigDecimal.valueOf(175));
        register.setWeightKg(BigDecimal.valueOf(70));

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andReturn();

        String challengeId = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("challengeId").asText();

        VerifyEmailRequest verify = new VerifyEmailRequest();
        verify.setChallengeId(challengeId);
        verify.setCode(capturedEmailStore.getLast().otpCode());

        MvcResult verifyResult = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE))
                .andReturn();

        return verifyResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
    }
}
