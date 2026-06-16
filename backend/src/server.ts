import "dotenv/config";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import { createApp } from "./app.js";
import { logger } from "./logger.js";
import { parseDynamicWorkbook } from "./parsers/dynamicWorkbookParser.js";

const { app, repository } = createApp();
const port = Number(process.env.PORT || 3001);

if (!process.env.DB_HOST && process.env.SEED_DEFAULT_PASSWORD) {
  const passwordHash = await bcrypt.hash(process.env.SEED_DEFAULT_PASSWORD, 4);
  for (const user of [
    { name: "Administrador GTF", email: process.env.SEED_ADMIN_EMAIL || "ti@grupogtf.com.br", role: "ADMIN" as const },
    { name: "Edson Albertassi", email: process.env.SEED_EDSON_EMAIL || "edson.albertassi@grupogtf.com.br", role: "ANALYST" as const },
    { name: "Leonardo Salles", email: process.env.SEED_LEONARDO_EMAIL || "leonardo.salles@grupogtf.com.br", role: "ANALYST" as const },
  ]) {
    if (!await repository.findUserByEmail(user.email)) await repository.createLocalUser({ ...user, passwordHash });
  }
}

if (process.env.DEMO_XLSX_PATH) {
  try {
    const imports = await repository.listImports();
    if (!imports.length) {
      const buffer = await fs.readFile(process.env.DEMO_XLSX_PATH);
      await repository.createImport({ fileName: process.env.DEMO_XLSX_PATH.split("/").pop()!, fileBuffer: buffer, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", period: process.env.DEMO_PERIOD || "Demonstração", userId: 1, parsed: parseDynamicWorkbook(buffer), logs: [{ level: "INFO", step: "DEMO", message: "Relatório de demonstração importado." }] });
    }
  } catch (error) { logger.warn({ err: error }, "demo_import_failed"); }
}

app.listen(port, () => logger.info({ port }, "api_started"));
