CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  role ENUM('ADMIN','ANALYST','VIEWER') NOT NULL DEFAULT 'VIEWER',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analysis_imports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  arquivo VARCHAR(255) NOT NULL,
  arquivo_mime VARCHAR(100) NULL,
  arquivo_tamanho BIGINT UNSIGNED NULL,
  arquivo_caminho VARCHAR(500) NULL,
  arquivo_blob MEDIUMBLOB NULL,
  periodo VARCHAR(100) NOT NULL,
  data_importacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id BIGINT UNSIGNED NULL,
  status ENUM('PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PROCESSING',
  total_analises INT UNSIGNED NOT NULL DEFAULT 0,
  total_registros INT UNSIGNED NOT NULL DEFAULT 0,
  erro TEXT NULL,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_analysis_imports_data (data_importacao),
  INDEX idx_analysis_imports_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analysis_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(190) NOT NULL,
  descricao TEXT NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  tipo_visualizacao ENUM('table','line','bar','area','pie','kpi') NOT NULL DEFAULT 'table',
  source_sheet VARCHAR(190) NOT NULL,
  schema_json JSON NOT NULL,
  filter_config_json JSON NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_analysis_types_active_order (ativo, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analysis_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  analysis_type_id BIGINT UNSIGNED NOT NULL,
  import_id BIGINT UNSIGNED NOT NULL,
  row_index INT UNSIGNED NOT NULL,
  payload_json JSON NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_type_id) REFERENCES analysis_types(id) ON DELETE CASCADE,
  FOREIGN KEY (import_id) REFERENCES analysis_imports(id) ON DELETE CASCADE,
  UNIQUE KEY uq_analysis_row (analysis_type_id, import_id, row_index),
  INDEX idx_analysis_data_lookup (analysis_type_id, import_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  import_id BIGINT UNSIGNED NOT NULL,
  nivel ENUM('INFO','WARNING','ERROR') NOT NULL DEFAULT 'INFO',
  etapa VARCHAR(100) NOT NULL,
  mensagem TEXT NOT NULL,
  contexto_json JSON NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES analysis_imports(id) ON DELETE CASCADE,
  INDEX idx_import_logs_import (import_id, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_password_reset_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(80) NOT NULL,
  destinatario VARCHAR(190) NOT NULL,
  status ENUM('QUEUED','SENT','FAILED','SKIPPED') NOT NULL,
  provider_id VARCHAR(190) NULL,
  erro TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_events_created (criado_em),
  INDEX idx_email_events_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
