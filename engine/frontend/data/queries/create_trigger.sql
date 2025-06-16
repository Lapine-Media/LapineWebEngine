
CREATE TRIGGER increment_active_user_on_update
AFTER UPDATE ON users
WHEN OLD.is_active = 0 AND NEW.is_active = 1
BEGIN
	UPDATE statistics
	SET active_user_count = active_user_count + 1
	WHERE id = 1;
END;
