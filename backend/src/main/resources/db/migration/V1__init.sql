CREATE TABLE users (
    id              CHAR(36)     NOT NULL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    mobile          VARCHAR(50),
    country         VARCHAR(10)  NOT NULL,
    national_id     VARBINARY(512) NOT NULL,
    health_id       VARCHAR(50)  NOT NULL UNIQUE,
    role            ENUM('CITIZEN', 'DOCTOR', 'ADMIN') NOT NULL DEFAULT 'CITIZEN',
    google_sub      VARCHAR(255),
    profile_image_url VARCHAR(512),
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE health_profiles (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    user_id             CHAR(36)     NOT NULL UNIQUE,
    blood_type          VARCHAR(10),
    height_cm           DECIMAL(5,2),
    weight_kg           DECIMAL(5,2),
    bmi                 DECIMAL(5,2),
    birth_date          DATE,
    eyesight_left       VARCHAR(20),
    eyesight_right      VARCHAR(20),
    allergies           VARBINARY(2048),
    doctor_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    ai_health_score     TEXT,
    last_ai_analysis    TIMESTAMP NULL,
    CONSTRAINT fk_hp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE vaccinations (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    user_id             CHAR(36)     NOT NULL,
    vaccine_name        VARCHAR(255) NOT NULL,
    dose_number         INT          NOT NULL DEFAULT 1,
    date_administered   DATE         NOT NULL,
    next_due_date       DATE,
    administered_by     VARCHAR(255),
    certificate_url     VARCHAR(512),
    CONSTRAINT fk_vac_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE medical_history (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    user_id             CHAR(36)     NOT NULL,
    condition_name      VARCHAR(255) NOT NULL,
    diagnosed_date      DATE,
    resolved_date       DATE,
    notes               VARBINARY(2048),
    document_url        VARCHAR(512),
    CONSTRAINT fk_mh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE doctors (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    user_id             CHAR(36)     NOT NULL UNIQUE,
    specialization      VARCHAR(255) NOT NULL,
    hospital            VARCHAR(255),
    license_number      VARCHAR(100) NOT NULL,
    lat                 DECIMAL(10,7),
    lng                 DECIMAL(10,7),
    avg_rating          DECIMAL(3,2) DEFAULT 0.00,
    is_available        BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_doc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    patient_id          CHAR(36)     NOT NULL,
    doctor_id           CHAR(36)     NOT NULL,
    scheduled_at        TIMESTAMP    NOT NULL,
    status              ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    notes               VARBINARY(1024),
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    user_id             CHAR(36),
    action              VARCHAR(100) NOT NULL,
    entity_type         VARCHAR(100) NOT NULL,
    entity_id           VARCHAR(100),
    ip_address          VARCHAR(45),
    timestamp           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_health_id ON users(health_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_location ON doctors(lat, lng);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
