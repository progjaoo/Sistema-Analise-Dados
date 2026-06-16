-- Seed inicial de usuarios para producao.
-- Senha comum: definida fora deste arquivo; somente o hash bcrypt e armazenado.

INSERT INTO users (nome, email, password_hash, role, ativo)
VALUES
  (
    'Administrador',
    'ti@grupogtf.com.br',
    '$2b$12$lvv/Ve6b8Ctq3gIzpAebQuZNoFy1Ok8GyReeTifP0.krF15jWowOG',
    'ADMIN',
    TRUE
  ),
  (
    'Edson Albertassi',
    'edson.albertassi@grupogtf.com.br',
    '$2b$12$lvv/Ve6b8Ctq3gIzpAebQuZNoFy1Ok8GyReeTifP0.krF15jWowOG',
    'ANALYST',
    TRUE
  ),
  (
    'Leonardo Salles',
    'leonardo.salles@grupogtf.com.br',
    '$2b$12$lvv/Ve6b8Ctq3gIzpAebQuZNoFy1Ok8GyReeTifP0.krF15jWowOG',
    'ANALYST',
    TRUE
  )
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  ativo = TRUE;
