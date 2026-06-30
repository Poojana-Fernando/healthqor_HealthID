package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Document(collection = "doctor_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorSchedule {

    @Id
    private String id;

    @Indexed(unique = true)
    private String doctorId;

    @Builder.Default
    private List<DaySchedule> days = new ArrayList<>();

    @Builder.Default
    private int slotDurationMinutes = 30;

    private Instant updatedAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        updatedAt = Instant.now();
    }
}
