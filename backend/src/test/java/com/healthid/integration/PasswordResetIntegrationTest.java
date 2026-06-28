package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.ForgotPasswordRequest;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.ResendPasswordResetRequest;
import com.healthid.dto.auth.ResetPasswordRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import com.healthid.service.EncryptionService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class PasswordResetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CapturedEmailStore capturedEmailStore;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EncryptionService encryptionService;

    @BeforeEach
    void clearCapturedEmail() {
        capturedEmailStore.clear();
    }

    @Test
    void forgotResetAndLoginWithNewPassword() throws Exception {
        completeRegistration("resetuser@healthid.lk", "oldpassword123");

        ForgotPasswordRequest forgot = new ForgotPasswordRequest();
        forgot.setEmail("resetuser@healthid.lk");

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgot)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        String otp = capturedEmailStore.getLastPasswordReset().otpCode();
        assertThat(otp).matches("\\d{6}");

        ResetPasswordRequest reset = new ResetPasswordRequest();
        reset.setEmail("resetuser@healthid.lk");
        reset.setCode(otp);
        reset.setNewPassword("newpassword456");

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reset)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        LoginRequest oldLogin = new LoginRequest();
        oldLogin.setEmail("resetuser@healthid.lk");
        oldLogin.setPassword("oldpassword123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLogin)))
                .andExpect(status().isUnauthorized());

        LoginRequest newLogin = new LoginRequest();
        newLogin.setEmail("resetuser@healthid.lk");
        newLogin.setPassword("newpassword456");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresVerification").value(false));
    }

    @Test
    void magicLinkResetWorks() throws Exception {
        completeRegistration("magicreset@healthid.lk", "oldpassword123");

        ForgotPasswordRequest forgot = new ForgotPasswordRequest();
        forgot.setEmail("magicreset@healthid.lk");
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgot)))
                .andExpect(status().isOk());

        String magicLink = capturedEmailStore.getLastPasswordReset().magicLinkUrl();
        String token = magicLink.substring(magicLink.indexOf("token=") + 6);
        String challengeId = magicLink.substring(magicLink.indexOf("challenge=") + 10, magicLink.indexOf("&token="));

        ResetPasswordRequest reset = new ResetPasswordRequest();
        reset.setChallengeId(challengeId);
        reset.setToken(token);
        reset.setNewPassword("magicnewpass99");

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reset)))
                .andExpect(status().isOk());
    }

    @Test
    void oauthOnlyUserDoesNotReceiveResetEmail() throws Exception {
        User oauthUser = User.builder()
                .name("OAuth User")
                .email("oauthonly@healthid.lk")
                .country("LK")
                .nationalId(encryptionService.encryptNationalId("OAUTH-ONLY-TEST"))
                .healthId("HID-LK-2000-OAUTH-ONLY")
                .role(Role.CITIZEN)
                .googleSub("google-oauth-only-test")
                .build();
        oauthUser.prepareForPersist();
        userRepository.save(oauthUser);

        ForgotPasswordRequest forgot = new ForgotPasswordRequest();
        forgot.setEmail("oauthonly@healthid.lk");

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgot)))
                .andExpect(status().isOk());

        assertThat(capturedEmailStore.getLastPasswordReset()).isNull();
    }

    @Test
    void resendPasswordResetIssuesNewCode() throws Exception {
        completeRegistration("resendreset@healthid.lk", "oldpassword123");

        ForgotPasswordRequest forgot = new ForgotPasswordRequest();
        forgot.setEmail("resendreset@healthid.lk");
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgot)))
                .andExpect(status().isOk());

        String firstOtp = capturedEmailStore.getLastPasswordReset().otpCode();

        ResendPasswordResetRequest resend = new ResendPasswordResetRequest();
        resend.setEmail("resendreset@healthid.lk");

        mockMvc.perform(post("/api/auth/resend-password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resend)))
                .andExpect(status().isOk());

        String secondOtp = capturedEmailStore.getLastPasswordReset().otpCode();
        assertThat(secondOtp).isNotEqualTo(firstOtp);
    }

    private void completeRegistration(String email, String password) throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Test User");
        register.setEmail(email);
        register.setPassword(password);
        register.setNationalId("NIC-" + email.hashCode());
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

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk());

        capturedEmailStore.clear();
    }
}
