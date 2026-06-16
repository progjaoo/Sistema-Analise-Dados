import "./config/env.js";
import bcrypt from "bcryptjs";
import express from "express";
import fs from "node:fs/promises";
import { createApp } from "./app.js";
import { loadedEnvFiles } from "./config/env.js";
import { logger } from "./logger.js";
import { parseDynamicWorkbook } from "./parsers/dynamicWorkbookParser.js";
import type { Repository } from "./types.js";

const port = Number(process.env.PORT || 3001);
const startup = createStartupApp();
const { app, repository, startupError } = startup;

function isDuplicateEntry(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido na inicializacao da API.";
}

function createStartupApp(): { app: express.Express; repository: Repository | null; startupError: string | null } {
  try {
    const created = createApp();
    return { ...created, startupError: null };
  } catch (error) {
    const message = errorMessage(error);
    logger.error({ err: error, loadedEnvFiles }, "api_startup_failed");
    const app = express();
    app.get("/api/health", (_req, res) => res.status(503).json({
      status: "error",
      storage: "none",
      error: message,
      database: {
        configured: Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME),
        hostSet: Boolean(process.env.DB_HOST),
        userSet: Boolean(process.env.DB_USER),
        nameSet: Boolean(process.env.DB_NAME),
      },
      env: {
        nodeEnv: process.env.NODE_ENV || null,
        requireDatabase: process.env.REQUIRE_DATABASE || null,
        loadedFiles: loadedEnvFiles.length,
      },
      timestamp: new Date().toISOString(),
    }));
    app.use((_req, res) => res.status(503).json({ error: message }));
    return { app, repository: null, startupError: message };
  }
}

async function seedInitialUsers() {
  if (!repository) return;
  if (!process.env.SEED_DEFAULT_PASSWORD) return;
  const passwordHash = await bcrypt.hash(process.env.SEED_DEFAULT_PASSWORD, 12);
  for (const user of [
    { name: "Administrador GTF", email: process.env.SEED_ADMIN_EMAIL || "ti@grupogtf.com.br", role: "ADMIN" as const },
    { name: "Edson Albertassi", email: process.env.SEED_EDSON_EMAIL || "edson.albertassi@grupogtf.com.br", role: "ANALYST" as const },
    { name: "Leonardo Salles", email: process.env.SEED_LEONARDO_EMAIL || "leonardo.salles@grupogtf.com.br", role: "ANALYST" as const },
  ]) {
    try {
      if (!await repository.findUserByEmail(user.email)) await repository.createLocalUser({ ...user, passwordHash });
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      logger.info({ email: user.email }, "seed_user_already_exists");
    }
  }
}

async function loadDemoData() {
  if (!repository) return;
  if (process.env.LOAD_DEMO_DATA !== "true" || !process.env.DEMO_XLSX_PATH) return;
  try {
    const imports = await repository.listImports();
    if (!imports.length) {
      const buffer = await fs.readFile(process.env.DEMO_XLSX_PATH);
      await repository.createImport({ fileName: process.env.DEMO_XLSX_PATH.split("/").pop()!, fileBuffer: buffer, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", period: process.env.DEMO_PERIOD || "Demonstração", userId: 1, parsed: parseDynamicWorkbook(buffer), logs: [{ level: "INFO", step: "DEMO", message: "Relatório de demonstração importado." }] });
    }
  } catch (error) { logger.warn({ err: error }, "demo_import_failed"); }
}

app.listen(port, () => {
  logger.info({ port, storage: repository?.constructor.name ?? "none", startupError }, "api_started");
  seedInitialUsers().catch((error) => logger.error({ err: error }, "seed_initial_users_failed"));
  loadDemoData().catch((error) => logger.warn({ err: error }, "demo_import_failed"));
});
