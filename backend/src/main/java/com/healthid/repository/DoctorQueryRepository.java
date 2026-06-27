package com.healthid.repository;

import com.healthid.entity.Doctor;
import org.springframework.data.domain.Sort;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.NearQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Repository
public class DoctorQueryRepository {

    private final MongoTemplate mongoTemplate;

    public DoctorQueryRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Doctor> findNearby(BigDecimal lat, BigDecimal lng, String specialty) {
        Point point = new Point(lng.doubleValue(), lat.doubleValue());
        Criteria criteria = Criteria.where("available").is(true)
                .and("location").exists(true);
        if (specialty != null && !specialty.isBlank()) {
            criteria = criteria.and("specialization").regex(specialty, "i");
        }
        NearQuery nearQuery = NearQuery.near(point)
                .spherical(true)
                .maxDistance(new Distance(100, Metrics.KILOMETERS))
                .query(Query.query(criteria));
        return mongoTemplate.geoNear(nearQuery, Doctor.class).getContent().stream()
                .map(geoResult -> geoResult.getContent())
                .toList();
    }

    public List<Doctor> search(String specialty, String location, Boolean available, BigDecimal minRating) {
        List<Criteria> parts = new ArrayList<>();
        if (specialty != null && !specialty.isBlank()) {
            parts.add(Criteria.where("specialization").regex(specialty, "i"));
        }
        if (location != null && !location.isBlank()) {
            parts.add(Criteria.where("hospital").regex(location, "i"));
        }
        if (available != null) {
            parts.add(Criteria.where("available").is(available));
        }
        if (minRating != null) {
            parts.add(Criteria.where("avgRating").gte(minRating));
        }
        Query query = new Query();
        if (!parts.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(parts.toArray(Criteria[]::new)));
        }
        query.with(Sort.by(Sort.Direction.DESC, "avgRating"));
        return mongoTemplate.find(query, Doctor.class);
    }
}
