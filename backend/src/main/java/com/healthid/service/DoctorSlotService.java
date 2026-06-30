package com.healthid.service;

import com.healthid.dto.doctorportal.DoctorSlotResponse;
import com.healthid.entity.*;
import com.healthid.exception.BadRequestException;
import com.healthid.exception.ResourceNotFoundException;
import com.healthid.repository.AppointmentRepository;
import com.healthid.repository.DoctorRepository;
import com.healthid.repository.DoctorScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class DoctorSlotService {

    private static final Set<AppointmentStatus> BLOCKING_STATUSES =
            EnumSet.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED);

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository doctorScheduleRepository;
    private final AppointmentRepository appointmentRepository;

    public DoctorSlotService(
            DoctorRepository doctorRepository,
            DoctorScheduleRepository doctorScheduleRepository,
            AppointmentRepository appointmentRepository) {
        this.doctorRepository = doctorRepository;
        this.doctorScheduleRepository = doctorScheduleRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public List<DoctorSlotResponse> generateAvailableSlots(String doctorId, Instant from, Instant to) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (!doctor.isActive() || !doctor.isVerifiedByAdmin() || !doctor.isAvailable()) {
            return List.of();
        }

        DoctorSchedule schedule = doctorScheduleRepository.findByDoctorId(doctorId).orElse(null);
        if (schedule == null || schedule.getDays() == null || schedule.getDays().isEmpty()) {
            return List.of();
        }

        ZoneId zone = ZoneId.systemDefault();
        LocalDate fromDate = from.atZone(zone).toLocalDate();
        LocalDate toDate = to.atZone(zone).toLocalDate();

        List<Instant> booked = appointmentRepository
                .findByDoctorIdAndScheduledAtBetweenAndStatusIn(
                        doctorId, from, to, new ArrayList<>(BLOCKING_STATUSES))
                .stream()
                .map(Appointment::getScheduledAt)
                .toList();

        List<DoctorSlotResponse> slots = new ArrayList<>();
        for (LocalDate date = fromDate; !date.isAfter(toDate); date = date.plusDays(1)) {
            DayOfWeek dow = date.getDayOfWeek();
            DaySchedule daySchedule = schedule.getDays().stream()
                    .filter(d -> d.getDayOfWeek() == dow && d.isEnabled())
                    .findFirst()
                    .orElse(null);
            if (daySchedule == null || daySchedule.getStartTime() == null || daySchedule.getEndTime() == null) {
                continue;
            }

            LocalDateTime cursor = LocalDateTime.of(date, daySchedule.getStartTime());
            LocalDateTime end = LocalDateTime.of(date, daySchedule.getEndTime());
            int duration = schedule.getSlotDurationMinutes();

            while (cursor.plusMinutes(duration).compareTo(end) <= 0) {
                Instant slotInstant = cursor.atZone(zone).toInstant();
                if (!slotInstant.isBefore(from) && !slotInstant.isAfter(to) && slotInstant.isAfter(Instant.now())) {
                    if (!isBooked(slotInstant, booked, duration)) {
                        slots.add(DoctorSlotResponse.builder().scheduledAt(slotInstant).build());
                    }
                }
                cursor = cursor.plusMinutes(duration);
            }
        }
        return slots;
    }

    @Transactional(readOnly = true)
    public void validateSlotForBooking(String doctorId, Instant scheduledAt) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (!doctor.isActive()) {
            throw new BadRequestException("Doctor is not available");
        }
        if (!doctor.isVerifiedByAdmin()) {
            throw new BadRequestException("Doctor is not verified");
        }
        if (!doctor.isAvailable()) {
            throw new BadRequestException("Doctor is not accepting appointments");
        }

        if (appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusIn(
                doctorId, scheduledAt, new ArrayList<>(BLOCKING_STATUSES))) {
            throw new BadRequestException("This time slot is already booked");
        }

        Instant from = scheduledAt.minusSeconds(1);
        Instant to = scheduledAt.plusSeconds(1);
        List<DoctorSlotResponse> slots = generateAvailableSlots(doctorId, from, to.plus(Duration.ofDays(1)));
        boolean valid = slots.stream().anyMatch(s -> s.getScheduledAt().equals(scheduledAt));
        if (!valid) {
            throw new BadRequestException("Selected time is not within doctor availability");
        }
    }

    private boolean isBooked(Instant slot, List<Instant> booked, int durationMinutes) {
        long slotEpoch = slot.toEpochMilli();
        long windowMs = durationMinutes * 60_000L;
        return booked.stream().anyMatch(b -> Math.abs(b.toEpochMilli() - slotEpoch) < windowMs);
    }
}
