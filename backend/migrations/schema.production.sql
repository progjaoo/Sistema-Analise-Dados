CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil ENUM('admin','viewer') NOT NULL DEFAULT 'viewer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_arquivo VARCHAR(255) NOT NULL,
  periodo VARCHAR(50) NOT NULL,
  data_upload DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  status ENUM('processando','ok','erro') NOT NULL DEFAULT 'processando',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ranking_geral (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  posicao INT NOT NULL,
  emissora VARCHAR(150) NOT NULL,
  audiencia_opm DECIMAL(14,2) NULL,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_ranking_upload (upload_id, posicao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maravilha_dia_dia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  bloco_horario VARCHAR(30) NOT NULL,
  dia_semana ENUM('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO','DOMINGO') NOT NULL,
  audiencia_opm DECIMAL(14,2) NULL,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_maravilha_dia (upload_id, dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maravilha_somatorio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  bloco_horario VARCHAR(30) NOT NULL,
  audiencia_total DECIMAL(14,2) NULL,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_maravilha_soma (upload_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS todas_emissoras_dia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  emissora VARCHAR(150) NOT NULL,
  dia_semana ENUM('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO','DOMINGO') NOT NULL,
  audiencia_opm DECIMAL(14,2) NULL,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_emissoras_dia (upload_id, emissora, dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analise_competitiva (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  bloco_horario VARCHAR(30) NOT NULL,
  emissora VARCHAR(150) NOT NULL,
  audiencia_opm DECIMAL(14,2) NULL,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_competitiva (upload_id, emissora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faixa_horaria_concorrentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  parte_do_dia VARCHAR(30) NOT NULL,
  dia_semana ENUM('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO','DOMINGO') NOT NULL,
  emissora VARCHAR(150) NOT NULL,
  audiencia_opm DECIMAL(14,2) NULL,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_faixa (upload_id, dia_semana, emissora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
