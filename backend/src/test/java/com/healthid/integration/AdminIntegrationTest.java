package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.admin.AdminCreateDoctorRequest;
import com.healthid.dto.admin.DoctorEducationDto;
import com.healthid.dto.appointment.AppointmentRequest;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.entity.Gender;
import com.healthid.entity.MaritalStatus;
import com.healthid.entity.NameTitle;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.UserRepository;
import com.healthid.security.JwtFilter;
import com.healthid.service.EncryptionService;
import com.healthid.service.HealthIdGenerator;
import com.healthid.service.email.CapturedEmailStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
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
    private EncryptionService encryptionService;

    @Autowired
    private HealthIdGenerator healthIdGenerator;

    @Autowired
    private CapturedEmailStore capturedEmailStore;

    private jakarta.servlet.http.Cookie adminCookie;

    @BeforeEach
    void setUp() throws Exception {
        capturedEmailStore.clear();
        ensureAdminUser();
        adminCookie = loginAdmin();
    }

    @Test
    void adminCanCreateListAndVerifyDoctor() throws Exception {
        AdminCreateDoctorRequest request = buildDoctorRequest("dr.admin@healthid.lk", "SLMC-001");

        MvcResult createResult = mockMvc.perform(post("/api/admin/doctors")
                        .cookie(adminCookie)
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dr.admin@healthid.lk"))
                .andExpect(jsonPath("$.verifiedByAdmin").value(false))
                .andReturn();

        String doctorId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/admin/doctors").cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").exists());

        mockMvc.perform(post("/api/admin/doctors/" + doctorId + "/verify?approved=true")
                        .with(csrf())
                        .cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("verified"));

        mockMvc.perform(get("/api/admin/doctors/" + doctorId).cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verifiedByAdmin").value(true));

        assertThat(capturedEmailStore.getLastDoctorInvitation()).isNotNull();
        assertThat(capturedEmailStore.getLastDoctorInvitation().toEmail()).isEqualTo("dr.admin@healthid.lk");
        assertThat(capturedEmailStore.getLastDoctorInvitation().magicLinkUrl()).contains("invite=1");
        assertThat(capturedEmailStore.getLastPasswordReset()).isNull();
    }

    @Test
    void adminCanCancelPatientAppointment() throws Exception {
        AdminCreateDoctorRequest doctorRequest = buildDoctorRequest("dr.book@healthid.lk", "SLMC-002");
        MvcResult doctorResult = mockMvc.perform(post("/api/admin/doctors")
                        .cookie(adminCookie)
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(doctorRequest)))
                .andExpect(status().isOk())
                .andReturn();
        String doctorId = objectMapper.readTree(doctorResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(post("/api/admin/doctors/" + doctorId + "/verify?approved=true")
                        .with(csrf())
                        .cookie(adminCookie))
                .andExpect(status().isOk());

        jakarta.servlet.http.Cookie patientCookie = registerAndVerifyPatient("patient.admin@healthid.lk");

        AppointmentRequest appointment = new AppointmentRequest();
        appointment.setDoctorId(doctorId);
        appointment.setScheduledAt(Instant.now().plusSeconds(86400));
        appointment.setNotes("Admin test booking");

        MvcResult bookResult = mockMvc.perform(post("/api/appointments")
                        .cookie(patientCookie)
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(appointment)))
                .andExpect(status().isOk())
                .andReturn();

        String appointmentId = objectMapper.readTree(bookResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(post("/api/admin/appointments/" + appointmentId + "/cancel")
                        .with(csrf())
                        .cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void adminCanDeletePatient() throws Exception {
        registerAndVerifyPatient("delete.me@healthid.lk");

        User patient = userRepository.findByEmail("delete.me@healthid.lk").orElseThrow();

        mockMvc.perform(get("/api/admin/patients/" + patient.getId()).cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("delete.me@healthid.lk"));

        mockMvc.perform(delete("/api/admin/patients/" + patient.getId()).with(csrf()).cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));

        mockMvc.perform(get("/api/admin/patients/" + patient.getId()).cookie(adminCookie))
                .andExpect(status().isNotFound());

        assertThat(userRepository.findById(patient.getId())).isEmpty();
    }

    @Test
    void adminStatsIncludePatientsAndDoctors() throws Exception {
        mockMvc.perform(get("/api/admin/stats").cookie(adminCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPatients").exists())
                .andExpect(jsonPath("$.totalDoctors").exists())
                .andExpect(jsonPath("$.pendingDoctorVerifications").exists());
    }

    private void ensureAdminUser() {
        if (userRepository.existsByEmail("admin@test.healthid.lk")) {
            return;
        }
        String healthId = healthIdGenerator.generate("LK", LocalDate.of(1990, 1, 1), "ADMIN-TEST");
        User admin = User.builder()
                .name("Test Admin")
                .email("admin@test.healthid.lk")
                .passwordHash(passwordEncoder.encode("adminpass123"))
                .country("LK")
                .nationalId(encryptionService.encryptNationalId("ADMIN-TEST-NIC"))
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
        login.setEmail("admin@test.healthid.lk");
        login.setPassword("adminpass123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE))
                .andReturn();

        assertThat(result.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE)).isNotNull();
        return result.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
    }

    private AdminCreateDoctorRequest buildDoctorRequest(String email, String license) {
        AdminCreateDoctorRequest request = new AdminCreateDoctorRequest();
        request.setName("Dr Admin Test");
        request.setEmail(email);
        request.setNationalId("199012345678");
        request.setCountry("LK");
        request.setBirthDate(LocalDate.of(1985, 5, 10));
        request.setGender(Gender.MALE);
        request.setNameTitle(NameTitle.DR);
        request.setSpecialization("General Medicine");
        request.setHospital("National Hospital");
        request.setLicenseNumber(license);
        DoctorEducationDto education = new DoctorEducationDto();
        education.setDegree("MBBS");
        education.setInstitution("University of Colombo");
        education.setYear(2010);
        request.setEducation(List.of(education));
        request.setExperienceYears(10);
        request.setMaritalStatus(MaritalStatus.MARRIED);
        return request;
    }

    private jakarta.servlet.http.Cookie registerAndVerifyPatient(String email) throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Patient Admin Test");
        register.setEmail(email);
        register.setPassword("password123");
        register.setNationalId("199011112222");
        register.setCountry("LK");
        register.setMobile("+94771234567");
        register.setBirthDate(LocalDate.of(1990, 3, 15));
        register.setBloodType("O+");
        register.setHeightCm(BigDecimal.valueOf(170));
        register.setWeightKg(BigDecimal.valueOf(65));

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

        return verifyResult.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
    }
}
