-- V2__seed_data.sql
-- Seed initial roles and admin user
-- Password for admin: 'admin123' (BCrypt hashed)

INSERT INTO roles (name) VALUES ('ROLE_ADMIN'), ('ROLE_OPERATOR'), ('ROLE_VIEWER');

INSERT INTO users (username, password_hash, email, is_active)
VALUES ('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCBtDssBfXRHqiJc7gJp1oC', 'admin@firesafe.local', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN';

-- Sample camera for testing
INSERT INTO cameras (name, rtsp_url, location, is_active)
VALUES ('Camera-Test-01', 'rtsp://localhost:8554/test', 'Tầng 1 - Khu A', TRUE);
