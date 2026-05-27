DELETE ur FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.email = 'admin@firesafe.local';

DELETE FROM users WHERE email = 'admin@firesafe.local';

INSERT INTO users (username, password_hash, email, is_active)
SELECT 'Admin', '$2a$12$nbn0upsjYtRlK71imVtw8Osc6wWuWbN4pBhgz9gltW/UkaJYZSkg.', 'admin@nhattienchung.vn', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@nhattienchung.vn');

UPDATE users
SET username = 'Admin',
    password_hash = '$2a$12$nbn0upsjYtRlK71imVtw8Osc6wWuWbN4pBhgz9gltW/UkaJYZSkg.',
    is_active = TRUE
WHERE email = 'admin@nhattienchung.vn';

DELETE ur FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.email = 'admin@nhattienchung.vn';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ROLE_ADMIN'
WHERE u.email = 'admin@nhattienchung.vn';
