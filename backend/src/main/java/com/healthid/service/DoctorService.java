package com.healthid.service;

import com.healthid.dto.doctor.DoctorResponse;
import com.healthid.entity.Doctor;
import com.healthid.entity.User;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.UserRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    public DoctorService(DoctorRepository doctorRepository, UserRepository userRepository) {
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "nearbyDoctors", key = "#lat + '-' + #lng + '-' + #specialty")
    public List<DoctorResponse> findNearby(BigDecimal lat, BigDecimal lng, String specialty) {
        return doctorRepository.findNearby(lat, lng, specialty)
                .stream()
                .limit(20)
                .map(d -> mapDoctor(d, haversineKm(lat, lng, d.getLat(), d.getLng())))
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "doctorSearch", key = "#specialty + '-' + #location + '-' + #available + '-' + #minRating")
    public List<DoctorResponse> search(String specialty, String location, Boolean available, BigDecimal minRating) {
        return doctorRepository.search(specialty, location, available, minRating)
                .stream()
                .map(d -> mapDoctor(d, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public DoctorResponse getDoctor(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        return mapDoctor(doctor, null);
    }

    public long countDoctors() {
        return doctorRepository.count();
    }

    private DoctorResponse mapDoctor(Doctor doctor, Double distanceKm) {
        User user = userRepository.findById(doctor.getUserId()).orElse(null);
        return DoctorResponse.builder()
                .id(doctor.getId())
                .userId(doctor.getUserId())
                .name(user != null ? user.getName() : "Unknown")
                .specialization(doctor.getSpecialization())
                .hospital(doctor.getHospital())
                .lat(doctor.getLat())
                .lng(doctor.getLng())
                .avgRating(doctor.getAvgRating())
                .available(doctor.isAvailable())
                .profileImageUrl(user != null ? user.getProfileImageUrl() : null)
                .distanceKm(distanceKm)
                .build();
    }

    private double haversineKm(BigDecimal lat1, BigDecimal lng1, BigDecimal lat2, BigDecimal lng2) {
        if (lat2 == null || lng2 == null) return 0;
        double R = 6371;
        double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double dLng = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1.doubleValue())) * Math.cos(Math.toRadians(lat2.doubleValue()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
