-- Remove resquicios de autenticacao Clerk. Execute no banco existente.

DELIMITER $$

CREATE PROCEDURE drop_column_if_exists(
  IN table_name_param VARCHAR(64),
  IN column_name_param VARCHAR(64),
  IN alter_sql_param TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_param
      AND COLUMN_NAME = column_name_param
  ) THEN
    SET @ddl = alter_sql_param;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE drop_index_if_exists(
  IN table_name_param VARCHAR(64),
  IN index_name_param VARCHAR(64),
  IN alter_sql_param TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_param
      AND INDEX_NAME = index_name_param
  ) THEN
    SET @ddl = alter_sql_param;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

CALL drop_index_if_exists('users', 'idx_users_clerk_id', 'ALTER TABLE users DROP INDEX idx_users_clerk_id');
CALL drop_index_if_exists('users', 'clerk_id', 'ALTER TABLE users DROP INDEX clerk_id');
CALL drop_column_if_exists('users', 'clerk_id', 'ALTER TABLE users DROP COLUMN clerk_id');
CALL drop_column_if_exists('users', 'auth_provider', 'ALTER TABLE users DROP COLUMN auth_provider');

DROP PROCEDURE drop_index_if_exists;
DROP PROCEDURE drop_column_if_exists;
