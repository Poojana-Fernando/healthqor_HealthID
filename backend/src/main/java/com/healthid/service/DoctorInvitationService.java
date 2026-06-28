package com.healthid.service;

import com.healthid.entity.EmailVerificationChallenge;
import com.healthid.entity.User;
import com.healthid.entity.VerificationPurpose;
import com.healthid.exception.BadRequestException;
import com.healthid.repository.EmailVerificationChallengeRepository;
import com.healthid.service.email.DoctorInvitationEmailPayload;
import com.healthid.service.email.EmailService;
import com.healthid.util.VerificationHasher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class DoctorInvitationService {

    private final EmailVerificationChallengeRepository challengeRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final String verificationPepper;
    private final String frontendOrigin;
    private final int otpExpiryMinutes;
    private final int maxSendsPerHour;

    public DoctorInvitationService(
            EmailVerificationChallengeRepository challengeRepository,
            EmailService emailService,
            AuditLogService auditLogService,
            @Value("${jwt.secret}") String verificationPepper,
            @Value("${frontend.origin}") String frontendOrigin,
            @Value("${email.otp-expiry-minutes}") int otpExpiryMinutes,
            @Value("${email.max-sends-per-hour}") int maxSendsPerHour) {
        this.challengeRepository = challengeRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.verificationPepper = verificationPepper;
        this.frontendOrigin = frontendOrigin;
        this.otpExpiryMinutes = otpExpiryMinutes;
        this.maxSendsPerHour = maxSendsPerHour;
    }

    @Transactional
    public void sendInvitation(User user) {
        enforceSendRateLimit(user.getEmail());

        String unusedOtp = VerificationHasher.generateOtp();
        String magicToken = VerificationHasher.generateMagicToken();

        EmailVerificationChallenge challenge = EmailVerificationChallenge.builder()
                .email(user.getEmail())
                .purpose(VerificationPurpose.DOCTOR_INVITE)
                .otpHash(VerificationHasher.hashValue(verificationPepper, unusedOtp))
                .magicTokenHash(VerificationHasher.hashValue(verificationPepper, magicToken))
                .expiresAt(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                .userId(user.getId())
                .build();
        challenge.prepareForPersist();
        challengeRepository.save(challenge);

        String magicLink = frontendOrigin + "/reset-password?challenge="
                + challenge.getId() + "&token=" + magicToken + "&invite=1";

        emailService.sendDoctorInvitationEmail(new DoctorInvitationEmailPayload(
                user.getEmail(),
                user.getName(),
                magicLink,
                otpExpiryMinutes
        ));

        auditLogService.log(user.getId(), "DOCTOR_INVITE_SENT", "User", user.getId());
    }

    private void enforceSendRateLimit(String email) {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        long recentSends = challengeRepository.countByEmailAndCreatedAtAfter(email, oneHourAgo);
        if (recentSends >= maxSendsPerHour) {
            throw new BadRequestException("Too many invitation emails sent. Please try again later.");
        }
    }
}
