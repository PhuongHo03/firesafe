-- V2__seed_data.sql
-- Seed initial roles and admin user
-- Password for admin: 'admin123' (BCrypt hashed)

INSERT INTO roles (name) VALUES ('ROLE_ADMIN'), ('ROLE_OPERATOR'), ('ROLE_VIEWER');

INSERT INTO users (username, password_hash, email, is_active)
VALUES ('admin', '$2a$12$nbn0upsjYtRlK71imVtw8Osc6wWuWbN4pBhgz9gltW/UkaJYZSkg.', 'admin@firesafe.local', TRUE);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN';
