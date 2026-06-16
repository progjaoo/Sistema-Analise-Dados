import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isString = (value: string | undefined): value is string => Boolean(value);
const unique = (items: Array<string | undefined>) => [...new Set(items.filter(isString))];

export function loadEnv() {
  const candidates = unique([
    process.env.DOTENV_CONFIG_PATH,
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend/.env"),
    fileURLToPath(new URL("../../.env", import.meta.url)),
    fileURLToPath(new URL("../../../.env", import.meta.url)),
  ]);

  for (const candidate of candidates) {
    if (existsSync(candidate)) dotenv.config({ path: candidate, override: false });
  }
}

loadEnv();
