package com.healthid.config.mongo;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.CreateCollectionOptions;
import com.mongodb.client.model.ValidationOptions;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@Order(0)
public class MongoInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoInitializer.class);

    private final MongoTemplate mongoTemplate;

    public MongoInitializer(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        MongoDatabase database = mongoTemplate.getDb();
        ensureCollection(database, "users", usersValidator());
        ensureCollection(database, "health_profiles", healthProfilesValidator());
        ensureCollection(database, "vaccinations", vaccinationsValidator());
        ensureCollection(database, "medical_history", medicalHistoryValidator());
        ensureCollection(database, "doctors", doctorsValidator());
        ensureCollection(database, "appointments", appointmentsValidator());
        ensureCollection(database, "audit_logs", auditLogsValidator());
        ensureCollection(database, "email_verification_challenges", emailVerificationChallengesValidator());
        ensureCollection(database, "pending_registrations", pendingRegistrationsValidator());
        ensureCollection(database, "phone_verification_challenges", phoneVerificationChallengesValidator());
        log.info("MongoDB collections and validators initialized");
    }

    private void ensureCollection(MongoDatabase database, String name, Document validator) {
        Set<String> existing = database.listCollectionNames().into(new java.util.HashSet<>());
        ValidationOptions validationOptions = new ValidationOptions().validator(validator);
        if (!existing.contains(name)) {
            database.createCollection(name, new CreateCollectionOptions().validationOptions(validationOptions));
            log.info("Created collection '{}' with validator", name);
        } else {
            database.runCommand(new Document("collMod", name).append("validator", validator));
            log.debug("Updated validator for collection '{}'", name);
        }
    }

    private Document usersValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of(
                        "name", "email", "country", "nationalId", "healthId", "role", "createdAt", "updatedAt"))
                .append("properties", new Document()
                        .append("name", new Document("bsonType", "string"))
                        .append("email", new Document("bsonType", "string"))
                        .append("country", new Document("bsonType", "string"))
                        .append("nationalId", new Document("bsonType", "binData"))
                        .append("healthId", new Document("bsonType", "string"))
                        .append("role", new Document("enum", java.util.List.of("CITIZEN", "DOCTOR", "ADMIN")))
                        .append("verified", new Document("bsonType", "bool"))
                        .append("emailVerifiedAt", new Document("bsonType", "date"))
                        .append("phoneVerified", new Document("bsonType", "bool"))
                        .append("phoneVerifiedAt", new Document("bsonType", "date"))
                        .append("createdAt", new Document("bsonType", "date"))
                        .append("updatedAt", new Document("bsonType", "date"))));
    }

    private Document healthProfilesValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("userId"))
                .append("properties", new Document()
                        .append("userId", new Document("bsonType", "string"))
                        .append("gender", new Document("enum", java.util.List.of("MALE", "FEMALE")))
                        .append("doctorVerified", new Document("bsonType", "bool"))));
    }

    private Document vaccinationsValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("userId", "vaccineName", "doseNumber", "dateAdministered"))
                .append("properties", new Document()
                        .append("userId", new Document("bsonType", "string"))
                        .append("vaccineName", new Document("bsonType", "string"))
                        .append("doseNumber", new Document("bsonType", "int"))
                        .append("dateAdministered", new Document("bsonType", "date"))));
    }

    private Document medicalHistoryValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("userId", "conditionName"))
                .append("properties", new Document()
                        .append("userId", new Document("bsonType", "string"))
                        .append("conditionName", new Document("bsonType", "string"))));
    }

    private Document doctorsValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of(
                        "userId", "nameTitle", "nic", "specialization", "hospital",
                        "licenseNumber", "experienceYears", "maritalStatus", "createdAt", "updatedAt"))
                .append("properties", new Document()
                        .append("userId", new Document("bsonType", "string"))
                        .append("nameTitle", new Document("enum", java.util.List.of(
                                "DR", "PROF", "MR", "MRS", "MISS")))
                        .append("nic", new Document("bsonType", "binData"))
                        .append("specialization", new Document("bsonType", "string"))
                        .append("hospital", new Document("bsonType", "string"))
                        .append("licenseNumber", new Document("bsonType", "string"))
                        .append("experienceYears", new Document("bsonType", "int"))
                        .append("maritalStatus", new Document("enum", java.util.List.of(
                                "SINGLE", "MARRIED", "DIVORCED", "WIDOWED")))
                        .append("verifiedByAdmin", new Document("bsonType", "bool"))
                        .append("available", new Document("bsonType", "bool"))
                        .append("deactivatedAt", new Document("bsonType", "date"))
                        .append("createdAt", new Document("bsonType", "date"))
                        .append("updatedAt", new Document("bsonType", "date"))));
    }

    private Document appointmentsValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("patientId", "doctorId", "scheduledAt", "status", "createdAt"))
                .append("properties", new Document()
                        .append("patientId", new Document("bsonType", "string"))
                        .append("doctorId", new Document("bsonType", "string"))
                        .append("scheduledAt", new Document("bsonType", "date"))
                        .append("status", new Document("enum", java.util.List.of(
                                "PENDING", "CONFIRMED", "CANCELLED", "COMPLETED")))
                        .append("createdAt", new Document("bsonType", "date"))));
    }

    private Document auditLogsValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("action", "entityType", "timestamp"))
                .append("properties", new Document()
                        .append("action", new Document("bsonType", "string"))
                        .append("entityType", new Document("bsonType", "string"))
                        .append("timestamp", new Document("bsonType", "date"))));
    }

    private Document emailVerificationChallengesValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("email", "purpose", "otpHash", "magicTokenHash", "expiresAt", "createdAt"))
                .append("properties", new Document()
                        .append("email", new Document("bsonType", "string"))
                        .append("purpose", new Document("enum", java.util.List.of("REGISTER", "LOGIN", "PASSWORD_RESET")))
                        .append("otpHash", new Document("bsonType", "string"))
                        .append("magicTokenHash", new Document("bsonType", "string"))
                        .append("expiresAt", new Document("bsonType", "date"))
                        .append("attempts", new Document("bsonType", "int"))
                        .append("maxAttempts", new Document("bsonType", "int"))
                        .append("consumedAt", new Document("bsonType", "date"))
                        .append("createdAt", new Document("bsonType", "date"))));
    }

    private Document phoneVerificationChallengesValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("userId", "mobile", "otpHash", "expiresAt", "createdAt"))
                .append("properties", new Document()
                        .append("userId", new Document("bsonType", "string"))
                        .append("mobile", new Document("bsonType", "string"))
                        .append("otpHash", new Document("bsonType", "string"))
                        .append("expiresAt", new Document("bsonType", "date"))
                        .append("attempts", new Document("bsonType", "int"))
                        .append("maxAttempts", new Document("bsonType", "int"))
                        .append("consumedAt", new Document("bsonType", "date"))
                        .append("createdAt", new Document("bsonType", "date"))
                        .append("lastSentAt", new Document("bsonType", "date"))));
    }

    private Document pendingRegistrationsValidator() {
        return new Document("$jsonSchema", new Document()
                .append("bsonType", "object")
                .append("required", java.util.List.of("email", "name", "passwordHash", "country", "nationalId", "healthId", "expiresAt", "createdAt"))
                .append("properties", new Document()
                        .append("email", new Document("bsonType", "string"))
                        .append("name", new Document("bsonType", "string"))
                        .append("passwordHash", new Document("bsonType", "string"))
                        .append("country", new Document("bsonType", "string"))
                        .append("nationalId", new Document("bsonType", "binData"))
                        .append("healthId", new Document("bsonType", "string"))
                        .append("expiresAt", new Document("bsonType", "date"))
                        .append("createdAt", new Document("bsonType", "date"))));
    }
}
