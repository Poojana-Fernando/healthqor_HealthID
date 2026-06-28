package com.healthid.service;

import com.healthid.dto.auth.AuthResultResponse;
import com.healthid.dto.auth.RegisterRequest;
import com.healthid.dto.auth.ResendVerificationRequest;
import com.healthid.dto.auth.VerifyEmailRequest;
import com.healthid.entity.*;
import com.healthid.exception.BadRequestException;
import com.healthid.repository.EmailVerificationChallengeRepository;
import com.healthid.repository.HealthProfileRepository;
import com.healthid.repository.PendingRegistrationRepository;
import com.healthid.repository.UserRepository;
import com.healthid.service.email.EmailService;
import com.healthid.service.email.VerificationEmailPayload;
import com.healthid.util.VerificationHasher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class EmailVerificationService {

    private final UserRepository userRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final EmailVerificationChallengeRepository challengeRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final EncryptionService encryptionService;
    private final HealthIdGenerator healthIdGenerator;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final String verificationPepper;
    private final String frontendOrigin;
    private final int otpExpiryMinutes;
    private final int reverifyDays;
    private final int resendCooldownSeconds;
    private final int maxSendsPerHour;

    public EmailVerificationService(
            UserRepository userRepository,
            PendingRegistrationRepository pendingRegistrationRepository,
            EmailVerificationChallengeRepository challengeRepository,
            HealthProfileRepository healthProfileRepository,
            PasswordEncoder passwordEncoder,
            EncryptionService encryptionService,
            HealthIdGenerator healthIdGenerator,
            EmailService emailService,
            AuditLogService auditLogService,
            @Value("${jwt.secret}") String verificationPepper,
            @Value("${frontend.origin}") String frontendOrigin,
            @Value("${email.otp-expiry-minutes}") int otpExpiryMinutes,
            @Value("${email.reverify-days}") int reverifyDays,
            @Value("${email.resend-cooldown-seconds}") int resendCooldownSeconds,
            @Value("${email.max-sends-per-hour}") int maxSendsPerHour) {
        this.userRepository = userRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.challengeRepository = challengeRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.encryptionService = encryptionService;
        this.healthIdGenerator = healthIdGenerator;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.verificationPepper = verificationPepper;
        this.frontendOrigin = frontendOrigin;
        this.otpExpiryMinutes = otpExpiryMinutes;
        this.reverifyDays = reverifyDays;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxSendsPerHour = maxSendsPerHour;
    }

    public boolean needsEmailReverification(User user) {
        if (user.getEmailVerifiedAt() == null) {
            return true;
        }
        Instant threshold = Instant.now().minus(reverifyDays, ChronoUnit.DAYS);
        return user.getEmailVerifiedAt().isBefore(threshold);
    }

    @Transactional
    public AuthResultResponse startRegistration(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }
        if (pendingRegistrationRepository.existsByEmailAndExpiresAtAfter(request.getEmail(), Instant.now())) {
            pendingRegistrationRepository.deleteByEmail(request.getEmail());
        }

        String healthId = healthIdGenerator.generate(request.getCountry(), request.getBirthDate(), request.getNationalId());
        while (userRepository.existsByHealthId(healthId)) {
            healthId = healthIdGenerator.generate(request.getCountry(), request.getBirthDate(), request.getNationalId());
        }

        BigDecimal bmi = calculateBmi(request.getHeightCm(), request.getWeightKg());
        String allergies = request.getAllergies() != null
                ? String.join(",", request.getAllergies())
                : null;

        PendingRegistration pending = PendingRegistration.builder()
                .email(request.getEmail())
                .name(request.getName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .mobile(request.getMobile())
                .country(request.getCountry())
                .nationalId(encryptionService.encryptNationalId(request.getNationalId()))
                .healthId(healthId)
                .gender(request.getGender() != null ? request.getGender() : Gender.MALE)
                .bloodType(request.getBloodType())
                .heightCm(request.getHeightCm())
                .weightKg(request.getWeightKg())
                .birthDate(request.getBirthDate())
                .allergies(encryptionService.encryptOptional(allergies))
                .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
                .build();
        pending.prepareForPersist();
        pendingRegistrationRepository.save(pending);

        EmailVerificationChallenge challenge = createAndSendChallenge(
                request.getEmail(),
                VerificationPurpose.REGISTER,
                pending.getId(),
                null
        );

        return AuthResultResponse.verificationRequired(
                challenge.getId(),
                VerificationHasher.maskEmail(request.getEmail()),
                challenge.getExpiresAt(),
                VerificationPurpose.REGISTER
        );
    }

    @Transactional
    public AuthResultResponse startLoginVerification(User user) {
        EmailVerificationChallenge challenge = createAndSendChallenge(
                user.getEmail(),
                VerificationPurpose.LOGIN,
                null,
                user.getId()
        );
        return AuthResultResponse.verificationRequired(
                challenge.getId(),
                VerificationHasher.maskEmail(user.getEmail()),
                challenge.getExpiresAt(),
                VerificationPurpose.LOGIN
        );
    }

    @Transactional
    public VerificationResult verify(VerifyEmailRequest request) {
        if ((request.getCode() == null || request.getCode().isBlank())
                && (request.getToken() == null || request.getToken().isBlank())) {
            throw new BadRequestException("Verification code or token is required");
        }

        EmailVerificationChallenge challenge = challengeRepository
                .findByIdAndConsumedAtIsNull(request.getChallengeId())
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification"));

        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification");
        }
        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            throw new BadRequestException("Invalid or expired verification");
        }

        boolean otpValid = request.getCode() != null
                && !request.getCode().isBlank()
                && VerificationHasher.matches(verificationPepper, request.getCode().trim(), challenge.getOtpHash());
        boolean tokenValid = request.getToken() != null
                && !request.getToken().isBlank()
                && VerificationHasher.matches(verificationPepper, request.getToken().trim(), challenge.getMagicTokenHash());

        if (!otpValid && !tokenValid) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            challengeRepository.save(challenge);
            throw new BadRequestException("Invalid or expired verification");
        }

        challenge.setConsumedAt(Instant.now());
        challengeRepository.save(challenge);

        if (challenge.getPurpose() == VerificationPurpose.REGISTER) {
            return new VerificationResult(materializeRegisteredUser(challenge), VerificationPurpose.REGISTER);
        }
        return new VerificationResult(markLoginVerified(challenge), VerificationPurpose.LOGIN);
    }

    @Transactional
    public AuthResultResponse resend(ResendVerificationRequest request) {
        EmailVerificationChallenge challenge = challengeRepository
                .findByIdAndConsumedAtIsNull(request.getChallengeId())
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification"));

        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification");
        }

        enforceSendRateLimit(challenge.getEmail());

        if (challenge.getLastSentAt() != null
                && challenge.getLastSentAt().plus(resendCooldownSeconds, ChronoUnit.SECONDS).isAfter(Instant.now())) {
            throw new BadRequestException("Please wait before requesting another verification email");
        }

        String otp = VerificationHasher.generateOtp();
        String magicToken = VerificationHasher.generateMagicToken();
        challenge.setOtpHash(VerificationHasher.hashValue(verificationPepper, otp));
        challenge.setMagicTokenHash(VerificationHasher.hashValue(verificationPepper, magicToken));
        challenge.setExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        challenge.setAttempts(0);
        challenge.setLastSentAt(Instant.now());
        challengeRepository.save(challenge);

        sendVerificationEmail(challenge, otp, magicToken);

        return AuthResultResponse.verificationRequired(
                challenge.getId(),
                VerificationHasher.maskEmail(challenge.getEmail()),
                challenge.getExpiresAt(),
                challenge.getPurpose()
        );
    }

    private EmailVerificationChallenge createAndSendChallenge(
            String email,
            VerificationPurpose purpose,
            String pendingRegistrationId,
            String userId) {
        enforceSendRateLimit(email);

        String otp = VerificationHasher.generateOtp();
        String magicToken = VerificationHasher.generateMagicToken();

        EmailVerificationChallenge challenge = EmailVerificationChallenge.builder()
                .email(email)
                .purpose(purpose)
                .otpHash(VerificationHasher.hashValue(verificationPepper, otp))
                .magicTokenHash(VerificationHasher.hashValue(verificationPepper, magicToken))
                .expiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                .pendingRegistrationId(pendingRegistrationId)
                .userId(userId)
                .build();
        challenge.prepareForPersist();
        challengeRepository.save(challenge);

        sendVerificationEmail(challenge, otp, magicToken);
        return challenge;
    }

    private void sendVerificationEmail(EmailVerificationChallenge challenge, String otp, String magicToken) {
        String magicLink = frontendOrigin + "/verify-email?challenge="
                + challenge.getId() + "&token=" + magicToken;
        String purposeLabel = challenge.getPurpose() == VerificationPurpose.REGISTER
                ? "complete your registration"
                : "sign in to your account";

        emailService.sendVerificationEmail(new VerificationEmailPayload(
                challenge.getEmail(),
                otp,
                magicLink,
                otpExpiryMinutes,
                purposeLabel
        ));
    }

    private void enforceSendRateLimit(String email) {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        long recentSends = challengeRepository.countByEmailAndCreatedAtAfter(email, oneHourAgo);
        if (recentSends >= maxSendsPerHour) {
            throw new BadRequestException("Too many verification emails sent. Please try again later.");
        }
    }

    private User materializeRegisteredUser(EmailVerificationChallenge challenge) {
        PendingRegistration pending = pendingRegistrationRepository
                .findById(challenge.getPendingRegistrationId())
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification"));

        if (pending.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification");
        }
        if (userRepository.existsByEmail(pending.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .name(pending.getName())
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .mobile(pending.getMobile())
                .country(pending.getCountry())
                .nationalId(pending.getNationalId())
                .healthId(pending.getHealthId())
                .role(Role.CITIZEN)
                .verified(false)
                .emailVerifiedAt(Instant.now())
                .phoneVerified(false)
                .build();
        userRepository.save(user);

        HealthProfile profile = HealthProfile.builder()
                .userId(user.getId())
                .gender(pending.getGender())
                .bloodType(pending.getBloodType())
                .heightCm(pending.getHeightCm())
                .weightKg(pending.getWeightKg())
                .bmi(calculateBmi(pending.getHeightCm(), pending.getWeightKg()))
                .birthDate(pending.getBirthDate())
                .allergies(pending.getAllergies())
                .build();
        healthProfileRepository.save(profile);

        pendingRegistrationRepository.delete(pending);
        auditLogService.log(user.getId(), "REGISTER", "User", user.getId());
        return user;
    }

    private User markLoginVerified(EmailVerificationChallenge challenge) {
        User user = userRepository.findById(challenge.getUserId())
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification"));
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);
        auditLogService.log(user.getId(), "EMAIL_VERIFIED_LOGIN", "User", user.getId());
        return user;
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
