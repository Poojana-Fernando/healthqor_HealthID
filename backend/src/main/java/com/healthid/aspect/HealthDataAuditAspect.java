package com.healthid.aspect;

import com.healthid.repository.UserRepository;
import com.healthid.service.AuditLogService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class HealthDataAuditAspect {

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    public HealthDataAuditAspect(AuditLogService auditLogService, UserRepository userRepository) {
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
    }

    @AfterReturning(
            pointcut = "execution(* com.healthid.service.ProfileService.getProfile(..)) || " +
                    "execution(* com.healthid.service.ProfileService.updateProfile(..)) || " +
                    "execution(* com.healthid.service.HealthDataService.*(..)) || " +
                    "execution(* com.healthid.service.AppointmentService.*(..)) || " +
                    "execution(* com.healthid.service.AIService.*(..))",
            returning = "result"
    )
    public void auditSensitiveAccess(JoinPoint joinPoint, Object result) {
        String methodName = joinPoint.getSignature().getName();
        String entityType = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String userId = resolveCurrentUserId();
        auditLogService.log(userId, "AOP_" + methodName.toUpperCase(), entityType, null);
    }

    private String resolveCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof String email) {
            return userRepository.findByEmail(email).map(u -> u.getId()).orElse(null);
        }
        return null;
    }
}
