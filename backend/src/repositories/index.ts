import { createPool } from "../config/db.js";
import type { Repository } from "../types.js";
import { MemoryRepository } from "./memoryRepository.js";
import { MysqlRepository } from "./mysqlRepository.js";

export function createRepository(env = process.env): Repository {
  return env.DB_HOST && env.DB_USER && env.DB_NAME ? new MysqlRepository(createPool(env)) : new MemoryRepository();
}
