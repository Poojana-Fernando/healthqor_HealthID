package com.healthid.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.appointment.AppointmentRequest;
import com.healthid.dto.auth.DoctorLoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.dto.doctorportal.DayScheduleDto;
import com.healthid.dto.doctorportal.DoctorScheduleRequest;
import com.healthid.dto.doctorportal.UpdateAppointmentStatusRequest;
import com.healthid.entity.*;
import com.healthid.repository.DoctorRepository;
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
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MongoTestcontainersConfig.class)
class DoctorPortalIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EncryptionService encryptionService;

    @Autowired
    private HealthIdGenerator healthIdGenerator;

    @Autowired
    private CapturedEmailStore capturedEmailStore;

    private jakarta.servlet.http.Cookie doctorCookie;
    private String doctorId;

    @BeforeEach
    void setUp() throws Exception {
        capturedEmailStore.clear();
        ensureDoctorUser();
        doctorCookie = loginDoctor();
    }

    @Test
    void doctorCanAccessPortalProfile() throws Exception {
        mockMvc.perform(get("/api/doctor/me").cookie(doctorCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dr.portal@healthid.lk"))
                .andExpect(jsonPath("$.specialization").value("General Medicine"));
    }

    @Test
    void doctorCanSetScheduleAndExposeSlots() throws Exception {
        DoctorScheduleRequest schedule = buildWeekdaySchedule();
        mockMvc.perform(put("/api/doctor/schedule")
                        .cookie(doctorCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(schedule)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slotDurationMinutes").value(30));

        Instant from = Instant.now();
        Instant to = from.plus(7, ChronoUnit.DAYS);

        mockMvc.perform(get("/api/doctors/" + doctorId + "/slots")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .cookie(doctorCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void doctorCanConfirmPatientAppointment() throws Exception {
        setDoctorSchedule();

        jakarta.servlet.http.Cookie patientCookie = registerPatient("patient.portal@healthid.lk");

        Instant from = Instant.now();
        Instant to = from.plus(7, ChronoUnit.DAYS);
        MvcResult slotsResult = mockMvc.perform(get("/api/doctors/" + doctorId + "/slots")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .cookie(patientCookie))
                .andExpect(status().isOk())
                .andReturn();

        String slotTime = objectMapper.readTree(slotsResult.getResponse().getContentAsString())
                .get(0).get("scheduledAt").asText();

        AppointmentRequest book = new AppointmentRequest();
        book.setDoctorId(doctorId);
        book.setScheduledAt(Instant.parse(slotTime));
        book.setNotes("Portal test");

        MvcResult bookResult = mockMvc.perform(post("/api/appointments")
                        .cookie(patientCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(book)))
                .andExpect(status().isOk())
                .andReturn();

        String appointmentId = objectMapper.readTree(bookResult.getResponse().getContentAsString())
                .get("id").asText();

        UpdateAppointmentStatusRequest confirm = new UpdateAppointmentStatusRequest();
        confirm.setStatus(AppointmentStatus.CONFIRMED);

        mockMvc.perform(patch("/api/doctor/appointments/" + appointmentId + "/status")
                        .cookie(doctorCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirm)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        var confirmationEmail = capturedEmailStore.getLastAppointmentConfirmation();
        assertThat(confirmationEmail).isNotNull();
        assertThat(confirmationEmail.toEmail()).isEqualTo("patient.portal@healthid.lk");
        assertThat(confirmationEmail.patientName()).isEqualTo("Patient Portal Test");
        assertThat(confirmationEmail.doctorName()).isEqualTo("Dr. Dr Portal Test");
        assertThat(confirmationEmail.referenceNumber()).isEqualTo(appointmentId.substring(0, 8).toUpperCase());
        assertThat(confirmationEmail.scheduledAtFormatted()).contains("Sri Lanka Time");
    }

    @Test
    void doctorCanLoginWithSlmcLicenseNumber() throws Exception {
        DoctorLoginRequest login = new DoctorLoginRequest();
        login.setIdentifier("slmc-portal-001");
        login.setPassword("doctorpass123");

        mockMvc.perform(post("/api/auth/doctor/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("DOCTOR"))
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE));
    }

    @Test
    void citizenCannotAccessDoctorPortal() throws Exception {
        jakarta.servlet.http.Cookie patientCookie = registerPatient("citizen.block@healthid.lk");

        mockMvc.perform(get("/api/doctor/me").cookie(patientCookie))
                .andExpect(status().isForbidden());
    }

    private void ensureDoctorUser() {
        if (userRepository.existsByEmail("dr.portal@healthid.lk")) {
            doctorId = doctorRepository.findByUserId(
                    userRepository.findByEmail("dr.portal@healthid.lk").orElseThrow().getId()
            ).orElseThrow().getId();
            return;
        }

        String healthId = healthIdGenerator.generate("LK", LocalDate.of(1985, 5, 10), "199012345678");
        User user = User.builder()
                .name("Dr Portal Test")
                .email("dr.portal@healthid.lk")
                .passwordHash(passwordEncoder.encode("doctorpass123"))
                .country("LK")
                .nationalId(encryptionService.encryptNationalId("199012345678"))
                .healthId(healthId)
                .role(Role.DOCTOR)
                .verified(true)
                .emailVerifiedAt(Instant.now())
                .phoneVerified(true)
                .build();
        userRepository.save(user);

        Doctor doctor = Doctor.builder()
                .userId(user.getId())
                .nameTitle(NameTitle.DR)
                .nic(encryptionService.encryptNationalId("199012345678"))
                .specialization("General Medicine")
                .hospital("Test Hospital")
                .licenseNumber("SLMC-PORTAL-001")
                .experienceYears(10)
                .maritalStatus(MaritalStatus.SINGLE)
                .verifiedByAdmin(true)
                .available(true)
                .build();
        doctor.prepareForPersist();
        doctorRepository.save(doctor);
        doctorId = doctor.getId();
    }

    private jakarta.servlet.http.Cookie loginDoctor() throws Exception {
        DoctorLoginRequest login = new DoctorLoginRequest();
        login.setIdentifier("dr.portal@healthid.lk");
        login.setPassword("doctorpass123");

        MvcResult result = mockMvc.perform(post("/api/auth/doctor/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(JwtFilter.ACCESS_TOKEN_COOKIE))
                .andReturn();

        return result.getResponse().getCookie(JwtFilter.ACCESS_TOKEN_COOKIE);
    }

    private void setDoctorSchedule() throws Exception {
        mockMvc.perform(put("/api/doctor/schedule")
                        .cookie(doctorCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildWeekdaySchedule())))
                .andExpect(status().isOk());
    }

    private DoctorScheduleRequest buildWeekdaySchedule() {
        List<DayScheduleDto> days = Arrays.stream(DayOfWeek.values()).map(dow -> {
            DayScheduleDto dto = new DayScheduleDto();
            dto.setDayOfWeek(dow);
            dto.setEnabled(dow.getValue() <= 5);
            dto.setStartTime(LocalTime.of(9, 0));
            dto.setEndTime(LocalTime.of(17, 0));
            return dto;
        }).toList();

        DoctorScheduleRequest request = new DoctorScheduleRequest();
        request.setDays(days);
        request.setSlotDurationMinutes(30);
        return request;
    }

    private jakarta.servlet.http.Cookie registerPatient(String email) throws Exception {
        RegisterRequest register = new RegisterRequest();
        register.setName("Patient Portal Test");
        register.setEmail(email);
        register.setPassword("password123");
        register.setNationalId("199011113333");
        register.setCountry("LK");
        register.setMobile("+94771234568");
        register.setBirthDate(LocalDate.of(1990, 3, 15));
        register.setBloodType("O+");
        register.setHeightCm(BigDecimal.valueOf(170));
        register.setWeightKg(BigDecimal.valueOf(65));

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
