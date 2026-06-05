-- V1__init_schema.sql
-- Initial database schema and seed data for FireSafe system

CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE cameras (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    rtsp_url   VARCHAR(500)  NOT NULL,
    location   VARCHAR(255),
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    camera_id   BIGINT         NOT NULL,
    label       VARCHAR(50)    NOT NULL,
    confidence  DECIMAL(5, 4)  NOT NULL,
    image_url   VARCHAR(1000),
    status      VARCHAR(50)    NOT NULL DEFAULT 'NEW',
    detected_at DATETIME       NOT NULL,
    created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras (id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_camera_id    ON alerts (camera_id);
CREATE INDEX idx_alerts_detected_at  ON alerts (detected_at DESC);
CREATE INDEX idx_alerts_status       ON alerts (status);

INSERT INTO users (username, password_hash, email, is_active)
VALUES ('Admin', '$2a$12$nbn0upsjYtRlK71imVtw8Osc6wWuWbN4pBhgz9gltW/UkaJYZSkg.', 'admin@nhattienchung.vn', TRUE);
