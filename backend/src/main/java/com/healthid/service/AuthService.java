package com.healthid.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthid.dto.auth.AuthResultResponse;
import com.healthid.dto.auth.AuthResponse;
import com.healthid.dto.auth.ForgotPasswordRequest;
import com.healthid.dto.auth.ForgotPasswordResponse;
import com.healthid.dto.auth.GoogleAuthRequest;
import com.healthid.dto.auth.LoginRequest;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.ResendPasswordResetRequest;
import com.healthid.dto.auth.ResendVerificationRequest;
import com.healthid.dto.auth.ResetPasswordRequest;
import com.healthid.dto.auth.ResetPasswordResponse;
import com.healthid.dto.auth.SendPhoneOtpResponse;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.dto.auth.VerifyPhoneRequest;
import com.healthid.dto.auth.VerifyPhoneResponse;
import com.healthid.entity.Gender;
import com.healthid.entity.HealthProfile;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.entity.VerificationPurpose;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.UserRepository;
import com.healthid.security.CustomUserDetailsService;
import com.healthid.security.JwtFilter;
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
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;
    private final PhoneVerificationService phoneVerificationService;
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
            AuditLogService auditLogService,
            EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService,
            PhoneVerificationService phoneVerificationService) {
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.encryptionService = encryptionService;
        this.healthIdGenerator = healthIdGenerator;
        this.auditLogService = auditLogService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
        this.phoneVerificationService = phoneVerificationService;
    }

    public AuthResultResponse register(RegisterRequest request, HttpServletResponse response) {
        return emailVerificationService.startRegistration(request);
    }

    public AuthResultResponse login(LoginRequest request, HttpServletResponse response) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            throw new UnauthorizedException("Invalid email or password");
        }
        User user = userDetailsService.loadEntityByEmail(request.getEmail());
        if (user.getRole() == Role.CITIZEN && emailVerificationService.needsEmailReverification(user)) {
            return emailVerificationService.startLoginVerification(user);
        }
        auditLogService.log(user.getId(), "LOGIN", "User", user.getId());
        setTokenCookies(user, response);
        return AuthResultResponse.fromAuth(toAuthResponse(user));
    }

    public AuthResultResponse verifyEmail(VerifyEmailRequest request, HttpServletResponse response) {
        VerificationResult result = emailVerificationService.verify(request);
        if (result.purpose() == VerificationPurpose.LOGIN) {
            auditLogService.log(result.user().getId(), "LOGIN", "User", result.user().getId());
        }
        setTokenCookies(result.user(), response);
        return AuthResultResponse.fromAuth(toAuthResponse(result.user()));
    }

    public AuthResultResponse resendVerification(ResendVerificationRequest request) {
        return emailVerificationService.resend(request);
    }

    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        return passwordResetService.requestReset(request.getEmail());
    }

    public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
        return passwordResetService.resetPassword(request);
    }

    public ForgotPasswordResponse resendPasswordReset(ResendPasswordResetRequest request) {
        return passwordResetService.resendReset(request);
    }

    public SendPhoneOtpResponse sendPhoneOtp(String email) {
        return phoneVerificationService.sendOtp(email);
    }

    public SendPhoneOtpResponse resendPhoneOtp(String email) {
        return phoneVerificationService.resendOtp(email);
    }

    public VerifyPhoneResponse verifyPhone(String email, VerifyPhoneRequest request) {
        return phoneVerificationService.verify(email, request);
    }

    @Transactional
    public AuthResponse googleAuth(GoogleAuthRequest request, HttpServletResponse response) {
        validateGoogleConfig();
        try {
            String redirectUri = request.getRedirectUri() != null && !request.getRedirectUri().isBlank()
                    ? request.getRedirectUri()
                    : frontendOrigin + "/auth/google/callback";

            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("code", request.getCode());
            params.add("client_id", googleClientId);
            params.add("client_secret", googleClientSecret);
            params.add("redirect_uri", redirectUri);
            params.add("grant_type", "authorization_code");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            ResponseEntity<String> tokenResponse;
            try {
                tokenResponse = restTemplate.postForEntity(
                        "https://oauth2.googleapis.com/token",
                        new HttpEntity<>(params, headers),
                        String.class
                );
            } catch (HttpStatusCodeException e) {
                String body = e.getResponseBodyAsString();
                if (body != null && !body.isBlank()) {
                    try {
                        JsonNode errorJson = objectMapper.readTree(body);
                        if (errorJson.has("error_description")) {
                            throw new BadRequestException("Google token exchange failed: " + errorJson.get("error_description").asText());
                        }
                        if (errorJson.has("error")) {
                            throw new BadRequestException("Google token exchange failed: " + errorJson.get("error").asText());
                        }
                    } catch (BadRequestException bre) {
                        throw bre;
                    } catch (Exception ignored) {
                        throw new BadRequestException("Google token exchange failed: " + body);
                    }
                }
                throw new BadRequestException("Google token exchange failed (HTTP " + e.getStatusCode().value() + "). Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and redirect URI.");
            }

            JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
            if (tokenJson.has("error")) {
                String description = tokenJson.has("error_description")
                        ? tokenJson.get("error_description").asText()
                        : tokenJson.get("error").asText();
                throw new BadRequestException("Google token exchange failed: " + description);
            }
            if (!tokenJson.has("access_token")) {
                throw new BadRequestException("Google token exchange failed: no access token returned");
            }
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
                    .orElseGet(() -> registerGoogleUser(googleSub, email, name, picture));

            if (user.getGoogleSub() == null) {
                user.setGoogleSub(googleSub);
            }
            if (picture != null) {
                user.setProfileImageUrl(picture);
            }
            user.setName(name);
            ensureOAuthEmailVerified(user);
            userRepository.save(user);

            auditLogService.log(user.getId(), "GOOGLE_LOGIN", "User", user.getId());
            setTokenCookies(user, response);
            return toAuthResponse(user);
        } catch (BadRequestException | UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Google authentication failed: " + e.getMessage());
        }
    }

    private void validateGoogleConfig() {
        if (googleClientId == null || googleClientId.isBlank() || "your_google_client_id".equals(googleClientId)) {
            throw new BadRequestException("Google OAuth is not configured on the server. Set GOOGLE_CLIENT_ID in .env");
        }
        if (googleClientSecret == null || googleClientSecret.isBlank() || "your_google_client_secret".equals(googleClientSecret)) {
            throw new BadRequestException("Google OAuth is not configured on the server. Set GOOGLE_CLIENT_SECRET in .env");
        }
    }

    private User registerGoogleUser(String googleSub, String email, String name, String picture) {
        LocalDate defaultBirthDate = LocalDate.of(2000, 1, 1);
        String country = "LK";
        String placeholderNationalId = "GOOGLE-" + googleSub;

        String healthId = healthIdGenerator.generate(country, defaultBirthDate, placeholderNationalId);
        while (userRepository.existsByHealthId(healthId)) {
            healthId = healthIdGenerator.generate(country, defaultBirthDate, placeholderNationalId);
        }

        User user = User.builder()
                .name(name)
                .email(email)
                .country(country)
                .nationalId(encryptionService.encryptNationalId(placeholderNationalId))
                .healthId(healthId)
                .googleSub(googleSub)
                .profileImageUrl(picture)
                .role(Role.CITIZEN)
                .verified(false)
                .emailVerifiedAt(Instant.now())
                .build();
        userRepository.save(user);

        HealthProfile profile = HealthProfile.builder()
                .userId(user.getId())
                .gender(Gender.MALE)
                .birthDate(defaultBirthDate)
                .build();
        healthProfileRepository.save(profile);

        auditLogService.log(user.getId(), "GOOGLE_REGISTER", "User", user.getId());
        return user;
    }

    public void logout(HttpServletResponse response) {
        clearTokenCookies(response);
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

        Cookie accessCookie = authCookie(JwtFilter.ACCESS_TOKEN_COOKIE, accessToken, 15 * 60);
        Cookie refreshCookie = authCookie(JwtFilter.REFRESH_TOKEN_COOKIE, refreshToken, 7 * 24 * 60 * 60);

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
    }

    private void clearTokenCookies(HttpServletResponse response) {
        response.addCookie(authCookie(JwtFilter.ACCESS_TOKEN_COOKIE, "", 0));
        response.addCookie(authCookie(JwtFilter.REFRESH_TOKEN_COOKIE, "", 0));
    }

    private Cookie authCookie(String name, String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSeconds);
        return cookie;
    }

    private void ensureOAuthEmailVerified(User user) {
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
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
}
