package com.healthid.service;

import com.healthid.dto.healthdata.MedicalHistoryResponse;
import com.healthid.dto.healthdata.VaccinationRequest;
import com.healthid.dto.healthdata.VaccinationResponse;
import com.healthid.entity.MedicalHistory;
import com.healthid.entity.Role;
import com.healthid.entity.User;
import com.healthid.entity.Vaccination;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.exception.UnauthorizedException;
import com.healthid.repository.MedicalHistoryRepository;
import com.healthid.repository.UserRepository;
import com.healthid.repository.VaccinationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HealthDataService {

    private final VaccinationRepository vaccinationRepository;
    private final MedicalHistoryRepository medicalHistoryRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public HealthDataService(
            VaccinationRepository vaccinationRepository,
            MedicalHistoryRepository medicalHistoryRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.vaccinationRepository = vaccinationRepository;
        this.medicalHistoryRepository = medicalHistoryRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<VaccinationResponse> getVaccinations(String email) {
        User user = getUserByEmail(email);
        auditLogService.log(user.getId(), "READ", "Vaccination", user.getId());
        return vaccinationRepository.findByUserIdOrderByDateAdministeredDesc(user.getId())
                .stream()
                .map(this::mapVaccination)
                .toList();
    }

    @Transactional
    public VaccinationResponse addVaccination(String requesterEmail, VaccinationRequest request) {
        User requester = getUserByEmail(requesterEmail);
        if (requester.getRole() != Role.DOCTOR && requester.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only doctors or admins can add vaccinations");
        }

        User target = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Vaccination vaccination = Vaccination.builder()
                .userId(target.getId())
                .vaccineName(request.getVaccineName())
                .doseNumber(request.getDoseNumber())
                .dateAdministered(request.getDateAdministered())
                .nextDueDate(request.getNextDueDate())
                .administeredBy(request.getAdministeredBy())
                .certificateUrl(request.getCertificateUrl())
                .build();
        vaccinationRepository.save(vaccination);

        auditLogService.log(requester.getId(), "CREATE", "Vaccination", vaccination.getId());
        return mapVaccination(vaccination);
    }

    @Transactional(readOnly = true)
    public List<MedicalHistoryResponse> getMedicalHistory(String email) {
        User user = getUserByEmail(email);
        auditLogService.log(user.getId(), "READ", "MedicalHistory", user.getId());
        return medicalHistoryRepository.findByUserIdOrderByDiagnosedDateDesc(user.getId())
                .stream()
                .map(this::mapMedicalHistory)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalHistoryResponse> getPreviousDiseases(String email) {
        return getMedicalHistory(email).stream()
                .filter(m -> m.getResolvedDate() != null)
                .toList();
    }

    private VaccinationResponse mapVaccination(Vaccination v) {
        return VaccinationResponse.builder()
                .id(v.getId())
                .vaccineName(v.getVaccineName())
                .doseNumber(v.getDoseNumber())
                .dateAdministered(v.getDateAdministered())
                .nextDueDate(v.getNextDueDate())
                .administeredBy(v.getAdministeredBy())
                .certificateUrl(v.getCertificateUrl())
                .build();
    }

    private MedicalHistoryResponse mapMedicalHistory(MedicalHistory m) {
        return MedicalHistoryResponse.builder()
                .id(m.getId())
                .conditionName(m.getConditionName())
                .diagnosedDate(m.getDiagnosedDate())
                .resolvedDate(m.getResolvedDate())
                .documentUrl(m.getDocumentUrl())
                .build();
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
