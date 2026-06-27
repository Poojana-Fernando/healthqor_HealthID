package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.security.JwtFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerAndLoginFlow() throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Test User");
        register.setEmail("test-" + System.nanoTime() + "@healthid.lk");
        register.setPassword("password123");
        register.setNationalId("199012345678");
        register.setCountry("LK");
        register.setBirthDate(LocalDate.of(1990, 1, 15));
        register.setBloodType("O+");
        register.setHeightCm(BigDecimal.valueOf(175));
        register.setWeightKg(BigDecimal.valueOf(70));
        register.setAllergies(java.util.List.of("seafood"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.healthId").value(org.hamcrest.Matchers.startsWith("HID-LK-1990-")))
                .andExpect(cookie().exists("healthid_access_token"))
                .andExpect(cookie().exists("healthid_refresh_token"));

        LoginRequest login = new LoginRequest();
        login.setEmail(register.getEmail());
        login.setPassword("password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(register.getEmail()));
    }

    @Test
    void profileRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void logoutClearsSessionCookies() throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Logout User");
        register.setEmail("logout-" + System.nanoTime() + "@healthid.lk");
        register.setPassword("password123");
        register.setNationalId("199077777777");
        register.setCountry("LK");
        register.setBirthDate(LocalDate.of(1993, 3, 3));

        MvcResult loginResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE))
                .andReturn();

        var accessCookie = loginResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
        var refreshCookie = loginResult.getResponse().getCookie(JwtFilter.REFRESH_TOKEN_COOKIE);

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(accessCookie, refreshCookie))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isForbidden());
    }
}
