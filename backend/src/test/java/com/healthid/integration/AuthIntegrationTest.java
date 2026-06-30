package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.ResendVerificationRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import com.healthid.security.JwtFilter;
import com.healthid.service.email.CapturedEmailStore;
import com.healthid.service.email.VerificationEmailPayload;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CapturedEmailStore capturedEmailStore;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void clearCapturedEmail() {
        capturedEmailStore.clear();
    }

    @Test
    void registerRequiresVerificationBeforeUserExists() throws Exception {
        RegisterRequest register = sampleRegister("verify@healthid.lk");

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(true))
                .andExpect(jsonPath("$.challengeId").exists())
                .andExpect(cookie().doesNotExist("healthid_access_token"))
                .andReturn();

        assertThat(userRepository.findByEmail("verify@healthid.lk")).isEmpty();

        String challengeId = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("challengeId").asText();
        VerificationEmailPayload email = capturedEmailStore.getLast();
        assertThat(email).isNotNull();
        assertThat(email.otpCode()).matches("\\d{6}");

        VerifyEmailRequest verify = new VerifyEmailRequest();
        verify.setChallengeId(challengeId);
        verify.setCode(email.otpCode());

        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(false))
                .andExpect(jsonPath("$.healthId").value(org.hamcrest.Matchers.startsWith("HID-LK-1990-")))
                .andExpect(cookie().exists("healthid_access_token"))
                .andExpect(cookie().exists("healthid_refresh_token"));

        User user = userRepository.findByEmail("verify@healthid.lk").orElseThrow();
        assertThat(user.getEmailVerifiedAt()).isNotNull();
    }

    @Test
    void loginRequiresReverificationWhenStale() throws Exception {
        completeRegistration("stale@healthid.lk");

        User user = userRepository.findByEmail("stale@healthid.lk").orElseThrow();
        user.setEmailVerifiedAt(Instant.now().minus(31, ChronoUnit.DAYS));
        userRepository.save(user);

        LoginRequest login = new LoginRequest();
        login.setEmail("stale@healthid.lk");
        login.setPassword("password123");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(true))
                .andExpect(cookie().doesNotExist("healthid_access_token"))
                .andReturn();

        String challengeId = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("challengeId").asText();
        VerificationEmailPayload email = capturedEmailStore.getLast();

        VerifyEmailRequest verify = new VerifyEmailRequest();
        verify.setChallengeId(challengeId);
        verify.setCode(email.otpCode());

        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(false))
                .andExpect(cookie().exists("healthid_access_token"));
    }

    @Test
    void magicLinkVerificationWorks() throws Exception {
        RegisterRequest register = sampleRegister("magic@healthid.lk");

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andReturn();

        String challengeId = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("challengeId").asText();
        String magicLink = capturedEmailStore.getLast().magicLinkUrl();
        String token = magicLink.substring(magicLink.indexOf("token=") + 6);

        VerifyEmailRequest verify = new VerifyEmailRequest();
        verify.setChallengeId(challengeId);
        verify.setToken(token);

        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(false))
                .andExpect(cookie().exists("healthid_access_token"));

        assertThat(userRepository.findByEmail("magic@healthid.lk")).isPresent();
    }

    @Test
    void resendVerificationIssuesNewCode() throws Exception {
        RegisterRequest register = sampleRegister("resend@healthid.lk");

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andReturn();

        String challengeId = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("challengeId").asText();
        String firstOtp = capturedEmailStore.getLast().otpCode();

        ResendVerificationRequest resend = new ResendVerificationRequest();
        resend.setChallengeId(challengeId);

        mockMvc.perform(post("/api/auth/resend-verification")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resend)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(true));

        String secondOtp = capturedEmailStore.getLast().otpCode();
        assertThat(secondOtp).isNotEqualTo(firstOtp);
    }

    @Test
    void profileRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void logoutClearsCookiesAndRevokesAccess() throws Exception {
        RegisterRequest register = sampleRegister("logout@healthid.lk");

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

        jakarta.servlet.http.Cookie accessCookie = verifyResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
        jakarta.servlet.http.Cookie refreshCookie = verifyResult.getResponse().getCookie(JwtFilter.REFRESH_TOKEN_COOKIE);

        mockMvc.perform(get("/api/profile/me").cookie(accessCookie))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout").with(csrf()).cookie(accessCookie, refreshCookie))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(JwtFilter.ACCESS_TOKEN_COOKIE, 0))
                .andExpect(cookie().maxAge(JwtFilter.REFRESH_TOKEN_COOKIE, 0));

        mockMvc.perform(get("/api/profile/me").cookie(accessCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void registerRejectsMissingMobile() throws Exception {
        RegisterRequest register = sampleRegister("nomobile@healthid.lk");
        register.setMobile(null);

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerRejectsInvalidMobile() throws Exception {
        RegisterRequest register = sampleRegister("badmobile@healthid.lk");
        register.setMobile("0771234567");

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerRejectsMissingBloodType() throws Exception {
        RegisterRequest register = sampleRegister("noblood@healthid.lk");
        register.setBloodType(null);

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isBadRequest());
    }

    private void completeRegistration(String email) throws Exception {
        RegisterRequest register = sampleRegister(email);
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

        mockMvc.perform(post("/api/auth/verify-email")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk());
    }

    private RegisterRequest sampleRegister(String email) {
        RegisterRequest register = new RegisterRequest();
        register.setName("Test User");
        register.setEmail(email);
        register.setPassword("password123");
        register.setNationalId("199012345678");
        register.setCountry("LK");
        register.setMobile("+94771234567");
        register.setBirthDate(LocalDate.of(1990, 1, 15));
        register.setBloodType("O+");
        register.setHeightCm(BigDecimal.valueOf(175));
        register.setWeightKg(BigDecimal.valueOf(70));
        register.setAllergies(java.util.List.of("seafood"));
        return register;
    }
}
