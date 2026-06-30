package com.healthid.service;

import com.healthid.dto.auth.ForgotPasswordResponse;
import com.healthid.dto.auth.ResendPasswordResetRequest;
import com.healthid.dto.auth.ResetPasswordRequest;
import com.healthid.dto.auth.ResetPasswordResponse;
import com.healthid.entity.EmailVerificationChallenge;
import com.healthid.entity.User;
import com.healthid.entity.VerificationPurpose;
import com.healthid.exception.BadRequestException;
import com.healthid.repository.EmailVerificationChallengeRepository;
import com.healthid.repository.UserRepository;
import com.healthid.service.email.EmailService;
import com.healthid.service.email.PasswordResetEmailPayload;
import com.healthid.util.VerificationHasher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final EmailVerificationChallengeRepository challengeRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final DoctorLoginIdentifierResolver doctorLoginIdentifierResolver;
    private final String verificationPepper;
    private final String frontendOrigin;
    private final int otpExpiryMinutes;
    private final int resendCooldownSeconds;
    private final int maxSendsPerHour;

    public PasswordResetService(
            UserRepository userRepository,
            EmailVerificationChallengeRepository challengeRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            AuditLogService auditLogService,
            DoctorLoginIdentifierResolver doctorLoginIdentifierResolver,
            @Value("${jwt.secret}") String verificationPepper,
            @Value("${frontend.origin}") String frontendOrigin,
            @Value("${email.otp-expiry-minutes}") int otpExpiryMinutes,
            @Value("${email.resend-cooldown-seconds}") int resendCooldownSeconds,
            @Value("${email.max-sends-per-hour}") int maxSendsPerHour) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.doctorLoginIdentifierResolver = doctorLoginIdentifierResolver;
        this.verificationPepper = verificationPepper;
        this.frontendOrigin = frontendOrigin;
        this.otpExpiryMinutes = otpExpiryMinutes;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxSendsPerHour = maxSendsPerHour;
    }

    @Transactional
    public ForgotPasswordResponse requestReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
                createAndSendChallenge(user);
            }
        });
        return ForgotPasswordResponse.generic();
    }

    @Transactional
    public ForgotPasswordResponse requestDoctorReset(String identifier) {
        doctorLoginIdentifierResolver.resolveDoctorUser(identifier).ifPresent(user -> {
            if (user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
                createAndSendChallenge(user);
            }
        });
        return ForgotPasswordResponse.generic();
    }

    @Transactional
    public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
        if ((request.getCode() == null || request.getCode().isBlank())
                && (request.getToken() == null || request.getToken().isBlank())) {
            throw new BadRequestException("Reset code or token is required");
        }

        EmailVerificationChallenge challenge = resolveChallenge(request);

        if (challenge.getPurpose() != VerificationPurpose.PASSWORD_RESET
                && challenge.getPurpose() != VerificationPurpose.DOCTOR_INVITE) {
            throw new BadRequestException("Invalid or expired reset request");
        }
        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired reset request");
        }
        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            throw new BadRequestException("Invalid or expired reset request");
        }

        boolean otpValid = challenge.getPurpose() == VerificationPurpose.PASSWORD_RESET
                && request.getCode() != null
                && !request.getCode().isBlank()
                && VerificationHasher.matches(verificationPepper, request.getCode().trim(), challenge.getOtpHash());
        boolean tokenValid = request.getToken() != null
                && !request.getToken().isBlank()
                && VerificationHasher.matches(verificationPepper, request.getToken().trim(), challenge.getMagicTokenHash());

        if (!otpValid && !tokenValid) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            challengeRepository.save(challenge);
            throw new BadRequestException("Invalid or expired reset request");
        }

        User user = userRepository.findById(challenge.getUserId())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset request"));
        if (user.getPasswordHash() == null) {
            throw new BadRequestException("Invalid or expired reset request");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);

        challenge.setConsumedAt(Instant.now());
        challengeRepository.save(challenge);

        auditLogService.log(user.getId(),
                challenge.getPurpose() == VerificationPurpose.DOCTOR_INVITE
                        ? "DOCTOR_PASSWORD_SET" : "PASSWORD_RESET",
                "User", user.getId());
        return ResetPasswordResponse.success();
    }

    @Transactional
    public ForgotPasswordResponse resendReset(ResendPasswordResetRequest request) {
        EmailVerificationChallenge challenge = resolveChallengeForResend(request);

        if (challenge.getPurpose() != VerificationPurpose.PASSWORD_RESET) {
            throw new BadRequestException("Invalid or expired reset request");
        }
        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired reset request");
        }

        enforceSendRateLimit(challenge.getEmail());

        if (challenge.getLastSentAt() != null
                && challenge.getLastSentAt().plus(resendCooldownSeconds, ChronoUnit.SECONDS).isAfter(Instant.now())) {
            throw new BadRequestException("Please wait before requesting another reset email");
        }

        String otp = VerificationHasher.generateOtp();
        String magicToken = VerificationHasher.generateMagicToken();
        challenge.setOtpHash(VerificationHasher.hashValue(verificationPepper, otp));
        challenge.setMagicTokenHash(VerificationHasher.hashValue(verificationPepper, magicToken));
        challenge.setExpiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES));
        challenge.setAttempts(0);
        challenge.setLastSentAt(Instant.now());
        challengeRepository.save(challenge);

        sendResetEmail(challenge, otp, magicToken);
        return ForgotPasswordResponse.generic();
    }

    private void createAndSendChallenge(User user) {
        enforceSendRateLimit(user.getEmail());

        String otp = VerificationHasher.generateOtp();
        String magicToken = VerificationHasher.generateMagicToken();

        EmailVerificationChallenge challenge = EmailVerificationChallenge.builder()
                .email(user.getEmail())
                .purpose(VerificationPurpose.PASSWORD_RESET)
                .otpHash(VerificationHasher.hashValue(verificationPepper, otp))
                .magicTokenHash(VerificationHasher.hashValue(verificationPepper, magicToken))
                .expiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                .userId(user.getId())
                .build();
        challenge.prepareForPersist();
        challengeRepository.save(challenge);

        sendResetEmail(challenge, otp, magicToken);
        auditLogService.log(user.getId(), "PASSWORD_RESET_REQUEST", "User", user.getId());
    }

    private void sendResetEmail(EmailVerificationChallenge challenge, String otp, String magicToken) {
        String magicLink = frontendOrigin + "/reset-password?challenge="
                + challenge.getId() + "&token=" + magicToken;
        emailService.sendPasswordResetEmail(new PasswordResetEmailPayload(
                challenge.getEmail(),
                otp,
                magicLink,
                otpExpiryMinutes
        ));
    }

    private EmailVerificationChallenge resolveChallenge(ResetPasswordRequest request) {
        if (request.getChallengeId() != null && !request.getChallengeId().isBlank()) {
            return challengeRepository.findByIdAndConsumedAtIsNull(request.getChallengeId())
                    .orElseThrow(() -> new BadRequestException("Invalid or expired reset request"));
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email or challenge ID is required");
        }
        return challengeRepository
                .findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                        request.getEmail(), VerificationPurpose.PASSWORD_RESET)
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset request"));
    }

    private EmailVerificationChallenge resolveChallengeForResend(ResendPasswordResetRequest request) {
        if (request.getChallengeId() != null && !request.getChallengeId().isBlank()) {
            return challengeRepository.findByIdAndConsumedAtIsNull(request.getChallengeId())
                    .orElseThrow(() -> new BadRequestException("Invalid or expired reset request"));
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email or challenge ID is required");
        }
        return challengeRepository
                .findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                        request.getEmail(), VerificationPurpose.PASSWORD_RESET)
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset request"));
    }

    private void enforceSendRateLimit(String email) {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        long recentSends = challengeRepository.countByEmailAndCreatedAtAfter(email, oneHourAgo);
        if (recentSends >= maxSendsPerHour) {
            throw new BadRequestException("Too many reset emails sent. Please try again later.");
        }
    }
}
