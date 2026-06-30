package com.healthid.service;

import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class DoctorLoginIdentifierResolver {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;

    public DoctorLoginIdentifierResolver(UserRepository userRepository, DoctorRepository doctorRepository) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
    }

    public Optional<User> resolveDoctorUser(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();
        if (trimmed.contains("@")) {
            return userRepository.findByEmail(trimmed)
                    .filter(user -> user.getRole() == Role.DOCTOR);
        }
        return doctorRepository.findByLicenseNumberIgnoreCase(trimmed)
                .flatMap(doctor -> userRepository.findById(doctor.getUserId()))
                .filter(user -> user.getRole() == Role.DOCTOR);
    }
}
