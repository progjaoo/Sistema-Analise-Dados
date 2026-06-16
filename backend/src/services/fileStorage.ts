import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const safeBaseName = (fileName: string) => {
  const parsed = path.parse(fileName);
  const base = parsed.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
  return `${base}${parsed.ext || ".xlsx"}`;
};

export function uploadDir(env = process.env) {
  return path.resolve(env.UPLOAD_STORAGE_DIR || "uploads/imports");
}

export async function saveImportFile(input: { fileName: string; buffer: Buffer; env?: NodeJS.ProcessEnv }) {
  const directory = uploadDir(input.env);
  await fs.mkdir(directory, { recursive: true });
  const storedName = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}-${safeBaseName(input.fileName)}`;
  const filePath = path.join(directory, storedName);
  await fs.writeFile(filePath, input.buffer);
  return filePath;
}

export async function readStoredFile(filePath: string) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) return null;
  return fs.readFile(filePath);
}

