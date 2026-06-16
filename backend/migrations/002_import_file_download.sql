-- Adiciona armazenamento do arquivo Excel original para download.
-- Execute no banco ja existente em producao.

DELIMITER $$

CREATE PROCEDURE add_column_if_missing(
  IN table_name_param VARCHAR(64),
  IN column_name_param VARCHAR(64),
  IN alter_sql_param TEXT
)
BEGIN
  IF NOT EXISTS (
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

DELIMITER ;

CALL add_column_if_missing('analysis_imports', 'arquivo_mime', 'ALTER TABLE analysis_imports ADD COLUMN arquivo_mime VARCHAR(100) NULL AFTER arquivo');
CALL add_column_if_missing('analysis_imports', 'arquivo_tamanho', 'ALTER TABLE analysis_imports ADD COLUMN arquivo_tamanho BIGINT UNSIGNED NULL AFTER arquivo_mime');
CALL add_column_if_missing('analysis_imports', 'arquivo_blob', 'ALTER TABLE analysis_imports ADD COLUMN arquivo_blob MEDIUMBLOB NULL AFTER arquivo_tamanho');

DROP PROCEDURE add_column_if_missing;

