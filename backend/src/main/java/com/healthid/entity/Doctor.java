package com.healthid.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Document(collection = "doctors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Indexed
    private NameTitle nameTitle;

    private byte[] nic;

    @Indexed
    private String specialization;

    private String hospital;

    @Indexed
    private String licenseNumber;

    @Builder.Default
    private List<DoctorEducation> education = new ArrayList<>();

    private Integer experienceYears;

    private MaritalStatus maritalStatus;

    @Builder.Default
    private boolean verifiedByAdmin = false;

    private BigDecimal lat;

    private BigDecimal lng;

    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPoint location;

    @Builder.Default
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Builder.Default
    private boolean available = true;

    private Instant deactivatedAt;

    private Instant createdAt;

    private Instant updatedAt;

    public void prepareForPersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        syncLocation();
    }

    public void touchUpdatedAt() {
        updatedAt = Instant.now();
    }

    public void syncLocation() {
        if (lat != null && lng != null) {
            location = new GeoJsonPoint(new Point(lng.doubleValue(), lat.doubleValue()));
        }
    }

    public boolean isActive() {
        return deactivatedAt == null;
    }
}
