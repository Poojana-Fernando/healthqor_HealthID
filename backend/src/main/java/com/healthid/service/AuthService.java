package com.healthid.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.AuthResponse;
import com.healthid.dto.auth.GoogleAuthRequest;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import com.healthid.security.CustomUserDetailsService;
import com.healthid.security.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final EncryptionService encryptionService;
    private final HealthIdGenerator healthIdGenerator;
    private final AuditLogService auditLogService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String googleClientSecret;

    @Value("${frontend.origin}")
    private String frontendOrigin;

    public AuthService(
            UserRepository userRepository,
            HealthProfileRepository healthProfileRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            AuthenticationManager authenticationManager,
            CustomUserDetailsService userDetailsService,
            EncryptionService encryptionService,
            HealthIdGenerator healthIdGenerator,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.encryptionService = encryptionService;
        this.healthIdGenerator = healthIdGenerator;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        String healthId = healthIdGenerator.generate(request.getCountry(), request.getBirthDate(), request.getNationalId());
        while (userRepository.existsByHealthId(healthId)) {
            healthId = healthIdGenerator.generate(request.getCountry(), request.getBirthDate(), request.getNationalId());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .mobile(request.getMobile())
                .country(request.getCountry())
                .nationalId(encryptionService.encryptNationalId(request.getNationalId()))
                .healthId(healthId)
                .role(Role.CITIZEN)
                .verified(false)
                .build();
        userRepository.save(user);

        BigDecimal bmi = calculateBmi(request.getHeightCm(), request.getWeightKg());
        String allergies = request.getAllergies() != null
                ? String.join(",", request.getAllergies())
                : null;

        HealthProfile profile = HealthProfile.builder()
                .userId(user.getId())
                .gender(request.getGender() != null ? request.getGender() : com.healthid.entity.Gender.MALE)
                .bloodType(request.getBloodType())
                .heightCm(request.getHeightCm())
                .weightKg(request.getWeightKg())
                .bmi(bmi)
                .birthDate(request.getBirthDate())
                .allergies(allergies)
                .build();
        healthProfileRepository.save(profile);

        auditLogService.log(user.getId(), "REGISTER", "User", user.getId());
        setTokenCookies(user, response);
        return toAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            throw new UnauthorizedException("Invalid email or password");
        }
        User user = userDetailsService.loadEntityByEmail(request.getEmail());
        auditLogService.log(user.getId(), "LOGIN", "User", user.getId());
        setTokenCookies(user, response);
        return toAuthResponse(user);
    }

    @Transactional
    public AuthResponse googleAuth(GoogleAuthRequest request, HttpServletResponse response) {
        try {
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("code", request.getCode());
            params.add("client_id", googleClientId);
            params.add("client_secret", googleClientSecret);
            params.add("redirect_uri", request.getRedirectUri() != null ? request.getRedirectUri() : frontendOrigin + "/signup");
            params.add("grant_type", "authorization_code");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            ResponseEntity<String> tokenResponse = restTemplate.postForEntity(
                    "https://oauth2.googleapis.com/token",
                    new HttpEntity<>(params, headers),
                    String.class
            );

            JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
            String accessToken = tokenJson.get("access_token").asText();

            HttpHeaders userHeaders = new HttpHeaders();
            userHeaders.setBearerAuth(accessToken);
            ResponseEntity<String> userInfoResponse = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET,
                    new HttpEntity<>(userHeaders),
                    String.class
            );

            JsonNode userInfo = objectMapper.readTree(userInfoResponse.getBody());
            String googleSub = userInfo.get("sub").asText();
            String email = userInfo.get("email").asText();
            String name = userInfo.has("name") ? userInfo.get("name").asText() : email;
            String picture = userInfo.has("picture") ? userInfo.get("picture").asText() : null;

            User user = userRepository.findByGoogleSub(googleSub)
                    .or(() -> userRepository.findByEmail(email))
                    .orElseThrow(() -> new BadRequestException(
                            "No account found. Please complete registration with your National ID first."
                    ));

            if (user.getGoogleSub() == null) {
                user.setGoogleSub(googleSub);
            }
            if (picture != null) {
                user.setProfileImageUrl(picture);
            }
            user.setName(name);
            userRepository.save(user);

            auditLogService.log(user.getId(), "GOOGLE_LOGIN", "User", user.getId());
            setTokenCookies(user, response);
            return toAuthResponse(user);
        } catch (BadRequestException | UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Google authentication failed");
        }
    }

    public AuthResponse refresh(String refreshToken, HttpServletResponse response) {
        try {
            Claims claims = jwtUtil.parseClaims(refreshToken);
            if (!jwtUtil.isRefreshToken(claims) || jwtUtil.isExpired(claims)) {
                throw new UnauthorizedException("Invalid refresh token");
            }
            User user = userRepository.findById(claims.getSubject())
                    .orElseThrow(() -> new UnauthorizedException("User not found"));
            setTokenCookies(user, response);
            return toAuthResponse(user);
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    private void setTokenCookies(User user, HttpServletResponse response) {
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail(), user.getRole());

        Cookie accessCookie = new Cookie(com.healthid.security.JwtFilter.ACCESS_TOKEN_COOKIE, accessToken);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(false);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(15 * 60);

        Cookie refreshCookie = new Cookie(com.healthid.security.JwtFilter.REFRESH_TOKEN_COOKIE, refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(false);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(7 * 24 * 60 * 60);

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
    }

    private AuthResponse toAuthResponse(User user) {
        return AuthResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .healthId(user.getHealthId())
                .role(user.getRole())
                .profileImageUrl(user.getProfileImageUrl())
                .build();
    }

    private BigDecimal calculateBmi(BigDecimal heightCm, BigDecimal weightKg) {
        if (heightCm == null || weightKg == null || heightCm.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal heightM = heightCm.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal bmi = weightKg.divide(heightM.multiply(heightM), 2, RoundingMode.HALF_UP);
        if (bmi.compareTo(BigDecimal.valueOf(999.99)) > 0) {
            return BigDecimal.valueOf(999.99);
        }
        return bmi;
    }
}
