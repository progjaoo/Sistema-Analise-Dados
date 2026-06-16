import "../src/config/env.js";
import bcrypt from "bcryptjs";
import { createPool } from "../src/config/db.js";

const password = process.env.SEED_DEFAULT_PASSWORD;
if (!password || password.length < 8) throw new Error("Defina SEED_DEFAULT_PASSWORD com pelo menos 8 caracteres antes de executar o seed.");

const users = [
  { name: "Administrador GTF", email: process.env.SEED_ADMIN_EMAIL || "ti@grupogtf.com.br", role: "ADMIN" },
  { name: "Edson Albertassi", email: process.env.SEED_EDSON_EMAIL || "edson.albertassi@grupogtf.com.br", role: "ANALYST" },
  { name: "Leonardo Salles", email: process.env.SEED_LEONARDO_EMAIL || "leonardo.salles@grupogtf.com.br", role: "ANALYST" },
] as const;

const pool = createPool();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  for (const user of users) {
    await pool.execute(
      `INSERT INTO users (nome, email, password_hash, role, ativo)
       VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE nome=VALUES(nome), password_hash=VALUES(password_hash), role=VALUES(role), ativo=TRUE`,
      [user.name, user.email.toLowerCase(), passwordHash, user.role],
    );
    console.log(`Usuário configurado: ${user.email} (${user.role})`);
  }
} finally { await pool.end(); }
