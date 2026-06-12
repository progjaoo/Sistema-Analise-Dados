import mysql from "mysql2/promise";

export function createPool(env = process.env) {
  return mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 8,
    namedPlaceholders: true,
    decimalNumbers: true,
    charset: "utf8mb4",
    ssl: env.DB_SSL === "true"
      ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  });
}
