import "../src/config/env.js";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createPool } from "../src/config/db.js";

const schemaPath = fileURLToPath(new URL("../migrations/schema.production.sql", import.meta.url));
const statements = (await fs.readFile(schemaPath, "utf8"))
  .replace(/^--.*$/gm, "")
  .split(/;\s*(?:\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);
const pool = createPool();
try {
  for (const statement of statements) await pool.query(statement);
  console.log(`${statements.length} comandos de estrutura executados.`);
} finally { await pool.end(); }

await import("./seedUsers.js");
