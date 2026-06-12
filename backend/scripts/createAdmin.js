import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPool } from "../src/config/db.js";

const required = ["DB_HOST", "DB_USER", "DB_NAME", "ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const pool = createPool();

  try {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.execute(
      `INSERT INTO usuarios (nome, email, senha, perfil)
       VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE nome = VALUES(nome), senha = VALUES(senha), perfil = 'admin'`,
      [process.env.ADMIN_NAME, process.env.ADMIN_EMAIL.toLowerCase(), passwordHash],
    );
    console.log(`Administrador configurado: ${process.env.ADMIN_EMAIL.toLowerCase()}`);
  } finally {
    await pool.end();
  }
}
