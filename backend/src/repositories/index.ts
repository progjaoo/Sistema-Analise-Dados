import { createPool } from "../config/db.js";
import type { Repository } from "../types.js";
import { MemoryRepository } from "./memoryRepository.js";
import { MysqlRepository } from "./mysqlRepository.js";

export function createRepository(env = process.env): Repository {
  if (env.DB_HOST && env.DB_USER && env.DB_NAME) return new MysqlRepository(createPool(env));
  if (env.NODE_ENV === "production" || env.REQUIRE_DATABASE === "true") {
    throw new Error("Banco de dados não configurado. Defina DB_HOST, DB_USER e DB_NAME.");
  }
  return new MemoryRepository();
}
