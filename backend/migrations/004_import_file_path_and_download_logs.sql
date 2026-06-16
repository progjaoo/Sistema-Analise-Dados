-- Salva caminho do arquivo original e registra auditoria de downloads.
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

CALL add_column_if_missing('analysis_imports', 'arquivo_caminho', 'ALTER TABLE analysis_imports ADD COLUMN arquivo_caminho VARCHAR(500) NULL AFTER arquivo_tamanho');

CREATE TABLE IF NOT EXISTS import_download_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  import_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  baixado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES analysis_imports(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_import_download_logs_import (import_id, baixado_em),
  INDEX idx_import_download_logs_user (usuario_id, baixado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE add_column_if_missing;

