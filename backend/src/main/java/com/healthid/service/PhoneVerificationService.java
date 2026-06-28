package com.healthid.service;

import com.healthid.dto.auth.SendPhoneOtpResponse;
import com.healthid.dto.auth.VerifyPhoneRequest;
import com.healthid.dto.auth.VerifyPhoneResponse;
import com.healthid.entity.PhoneVerificationChallenge;
import com.healthid.entity.User;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.PhoneVerificationChallengeRepository;
import com.healthid.repository.UserRepository;
import com.healthid.service.sms.SmsOtpPayload;
import com.healthid.service.sms.SmsService;
import com.healthid.util.VerificationHasher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PhoneVerificationService {

    private final Map<String, Object> sendLocks = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final PhoneVerificationChallengeRepository challengeRepository;
    private final SmsService smsService;
    private final AuditLogService auditLogService;
    private final String verificationPepper;
    private final int otpExpiryMinutes;
    private final int resendCooldownSeconds;
    private final int maxSendsPerHour;
    private final TransactionTemplate transactionTemplate;

    public PhoneVerificationService(
            UserRepository userRepository,
            PhoneVerificationChallengeRepository challengeRepository,
            SmsService smsService,
            AuditLogService auditLogService,
            PlatformTransactionManager transactionManager,
            @Value("${jwt.secret}") String verificationPepper,
            @Value("${phone.otp-expiry-minutes:15}") int otpExpiryMinutes,
            @Value("${phone.resend-cooldown-seconds:60}") int resendCooldownSeconds,
            @Value("${phone.max-sends-per-hour:3}") int maxSendsPerHour) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.smsService = smsService;
        this.auditLogService = auditLogService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.verificationPepper = verificationPepper;
        this.otpExpiryMinutes = otpExpiryMinutes;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxSendsPerHour = maxSendsPerHour;
    }

    public SendPhoneOtpResponse sendOtp(String email) {
        User user = requireUser(email);
        if (user.isPhoneVerified()) {
            return SendPhoneOtpResponse.builder()
                    .maskedMobile(VerificationHasher.maskMobile(user.getMobile()))
                    .message("Phone number already verified")
                    .build();
        }
        String mobile = normalizeMobile(user.getMobile());
        if (mobile == null) {
            throw new BadRequestException("No mobile number on file to verify");
        }

        synchronized (sendLock(user.getId())) {
            PendingOtpSend pending = transactionTemplate.execute(status -> {
                enforceSendRateLimit(user.getId());
                challengeRepository.deleteByUserIdAndConsumedAtIsNull(user.getId());

                String otp = VerificationHasher.generateOtp();
                PhoneVerificationChallenge challenge = PhoneVerificationChallenge.builder()
                        .userId(user.getId())
                        .mobile(mobile)
                        .otpHash(VerificationHasher.hashValue(verificationPepper, otp))
                        .expiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                        .build();
                challenge.prepareForPersist();
                challengeRepository.save(challenge);

                return new PendingOtpSend(challenge.getId(), mobile, otp, challenge.getExpiresAt());
            });

            if (pending == null) {
                throw new BadRequestException("Failed to create phone verification challenge");
            }

            try {
                smsService.sendPhoneOtp(new SmsOtpPayload(pending.mobile(), pending.otp(), otpExpiryMinutes));
            } catch (RuntimeException ex) {
                challengeRepository.deleteById(pending.challengeId());
                throw ex;
            }

            return SendPhoneOtpResponse.builder()
                    .maskedMobile(VerificationHasher.maskMobile(pending.mobile()))
                    .expiresAt(pending.expiresAt())
                    .message("Verification code sent")
                    .build();
        }
    }

    public SendPhoneOtpResponse resendOtp(String email) {
        User user = requireUser(email);
        if (user.isPhoneVerified()) {
            return SendPhoneOtpResponse.builder()
                    .maskedMobile(VerificationHasher.maskMobile(user.getMobile()))
                    .message("Phone number already verified")
                    .build();
        }

        PhoneVerificationChallenge existing = requireActiveChallenge(user.getId(), false);

        if (existing != null
                && existing.getLastSentAt() != null
                && existing.getLastSentAt().plus(resendCooldownSeconds, ChronoUnit.SECONDS).isAfter(Instant.now())) {
            throw new BadRequestException("Please wait before requesting another code");
        }

        return sendOtp(email);
    }

    @Transactional
    public VerifyPhoneResponse verify(String email, VerifyPhoneRequest request) {
        User user = requireUser(email);
        if (user.isPhoneVerified()) {
            return VerifyPhoneResponse.builder()
                    .phoneVerified(true)
                    .mobile(user.getMobile())
                    .build();
        }

        PhoneVerificationChallenge challenge = requireActiveChallenge(user.getId(), true);

        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Verification code expired. Request a new code.");
        }
        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            throw new BadRequestException("Too many attempts. Request a new code.");
        }

        boolean valid = VerificationHasher.matches(
                verificationPepper,
                request.getCode().trim(),
                challenge.getOtpHash()
        );

        if (!valid) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            challengeRepository.save(challenge);
            throw new BadRequestException("Invalid verification code");
        }

        challenge.setConsumedAt(Instant.now());
        challengeRepository.save(challenge);

        user.setPhoneVerified(true);
        user.setPhoneVerifiedAt(Instant.now());
        userRepository.save(user);

        auditLogService.log(user.getId(), "PHONE_VERIFIED", "User", user.getId());

        return VerifyPhoneResponse.builder()
                .phoneVerified(true)
                .mobile(user.getMobile())
                .build();
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Authentication required"));
    }

    private void enforceSendRateLimit(String userId) {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        long recentSends = challengeRepository.countByUserIdAndCreatedAtAfter(userId, oneHourAgo);
        if (recentSends >= maxSendsPerHour) {
            throw new BadRequestException("Too many verification codes sent. Please try again later.");
        }
    }

    private String normalizeMobile(String mobile) {
        if (mobile == null || mobile.isBlank()) {
            return null;
        }
        return mobile.trim();
    }

    private Object sendLock(String userId) {
        return sendLocks.computeIfAbsent(userId, ignored -> new Object());
    }

    private PhoneVerificationChallenge requireActiveChallenge(String userId, boolean required) {
        List<PhoneVerificationChallenge> active = challengeRepository
                .findAllByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(userId);
        if (active.isEmpty()) {
            if (required) {
                throw new BadRequestException("No active phone verification. Request a new code.");
            }
            return null;
        }
        PhoneVerificationChallenge latest = active.get(0);
        if (active.size() > 1) {
            active.stream().skip(1).forEach(challengeRepository::delete);
        }
        return latest;
    }

    private record PendingOtpSend(String challengeId, String mobile, String otp, Instant expiresAt) {
    }
}
