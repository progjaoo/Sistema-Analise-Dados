import { createPool } from "../config/db.js";
import { MemoryRepository } from "./memoryRepository.js";
import { MysqlRepository } from "./mysqlRepository.js";

export function createRepository(env = process.env) {
  if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
    return new MysqlRepository(createPool(env));
  }
  return new MemoryRepository();
}
