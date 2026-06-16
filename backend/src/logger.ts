import pino from "pino";

export const logger = pino({ level: process.env.LOG_LEVEL || "info", base: { service: "maravilha-ibope-api" }, redact: ["req.headers.authorization", "password", "senha", "token", "RESEND_API_KEY"] });
