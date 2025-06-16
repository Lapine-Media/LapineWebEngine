
CREATE VIEW ?table_name AS
SELECT id, username, email
FROM users
WHERE is_active = 1;
