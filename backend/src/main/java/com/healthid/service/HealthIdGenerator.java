package com.healthid.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.LocalDate;

@Component
public class HealthIdGenerator {

    private final SecureRandom random = new SecureRandom();

    public String generate(String countryCode, LocalDate birthDate, String nationalId) {
        String country = countryCode.toUpperCase();
        int birthYear = birthDate.getYear();
        String hashPrefix = EncryptionService.sha256Prefix(nationalId);
        int randomDigits = 1000 + random.nextInt(9000);
        return String.format("HID-%s-%d-%s-%d", country, birthYear, hashPrefix, randomDigits);
    }
}
