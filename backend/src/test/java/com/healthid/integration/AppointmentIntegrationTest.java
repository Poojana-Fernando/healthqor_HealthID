package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.appointment.AppointmentRequest;
import com.healthid.dto.appointment.AppointmentUpdateRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.entity.Doctor;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.UserRepository;
import com.healthid.security.JwtFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AppointmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    private String doctorId;
    private jakarta.servlet.http.Cookie accessCookie;

    @BeforeEach
    void setUp() throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Patient One");
        register.setEmail("patient-appt-" + System.nanoTime() + "@healthid.lk");
        register.setPassword("password123");
        register.setNationalId("199055555555");
        register.setCountry("LK");
        register.setBirthDate(LocalDate.of(1995, 1, 1));

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isOk())
                .andReturn();

        accessCookie = registerResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);

        User doctorUser = User.builder()
                .name("Dr Test")
                .email("doctor-appt-" + System.nanoTime() + "@healthid.lk")
                .country("LK")
                .nationalId(new byte[]{1, 2, 3})
                .healthId("HID-LK-1980-TEST-" + System.nanoTime())
                .role(Role.DOCTOR)
                .verified(true)
                .build();
        userRepository.save(doctorUser);

        Doctor doctor = Doctor.builder()
                .userId(doctorUser.getId())
                .specialization("General Medicine")
                .hospital("Test Hospital")
                .licenseNumber("LIC-001")
                .available(true)
                .avgRating(BigDecimal.valueOf(4.0))
                .build();
        doctorId = doctorRepository.save(doctor).getId();
    }

    @Test
    void appointmentCrudFlow() throws Exception {
        AppointmentRequest book = new AppointmentRequest();
        book.setDoctorId(doctorId);
        book.setScheduledAt(Instant.now().plus(2, ChronoUnit.DAYS));
        book.setNotes("Initial visit");

        MvcResult bookResult = mockMvc.perform(post("/api/appointments")
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(book)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        String appointmentId = objectMapper.readTree(bookResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/appointments/" + appointmentId)
                        .cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doctorName").value("Dr Test"));

        AppointmentUpdateRequest update = new AppointmentUpdateRequest();
        update.setScheduledAt(Instant.now().plus(3, ChronoUnit.DAYS));
        update.setNotes("Rescheduled");

        mockMvc.perform(put("/api/appointments/" + appointmentId)
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes").value("Rescheduled"));

        mockMvc.perform(delete("/api/appointments/" + appointmentId)
                        .cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }
}
