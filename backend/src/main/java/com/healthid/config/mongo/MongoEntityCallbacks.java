package com.healthid.config.mongo;

import com.healthid.entity.*;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertCallback;
import org.springframework.stereotype.Component;

@Component
public class MongoEntityCallbacks implements BeforeConvertCallback<Object> {

    @Override
    public Object onBeforeConvert(Object entity, String collection) {
        if (entity instanceof User user) {
            user.prepareForPersist();
        } else if (entity instanceof HealthProfile profile) {
            profile.prepareForPersist();
        } else if (entity instanceof Vaccination vaccination) {
            vaccination.prepareForPersist();
        } else if (entity instanceof MedicalHistory history) {
            history.prepareForPersist();
        } else if (entity instanceof Doctor doctor) {
            doctor.prepareForPersist();
        } else if (entity instanceof Appointment appointment) {
            appointment.prepareForPersist();
        } else if (entity instanceof AuditLog auditLog) {
            auditLog.prepareForPersist();
        }
        return entity;
    }
}
