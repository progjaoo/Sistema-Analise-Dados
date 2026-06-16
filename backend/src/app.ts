import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { createAnalysisController } from "./controllers/analysisController.js";
import { createAuthController } from "./controllers/authController.js";
import { createImportController } from "./controllers/importController.js";
import { createUserController } from "./controllers/userController.js";
import { logger } from "./logger.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createRepository } from "./repositories/index.js";
import { analysisRoutes } from "./routes/analyses.js";
import { authRoutes } from "./routes/auth.js";
import { importRoutes } from "./routes/imports.js";
import { userRoutes } from "./routes/users.js";
import { createEmailService } from "./services/email/index.js";
import type { Repository } from "./types.js";

function normalizeOrigin(value?: string) {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

function allowedCorsOrigins(env: NodeJS.ProcessEnv) {
  return new Set(
    [
      ...(env.FRONTEND_ORIGIN || "http://localhost:5173").split(","),
      env.FRONTEND_PUBLIC_URL,
    ]
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  );
}

export function createApp({ repository = createRepository(), env = process.env }: { repository?: Repository; env?: NodeJS.ProcessEnv } = {}) {
  const app = express();
  const emailService = createEmailService(repository, env);
  const auth = createAuthMiddleware(repository, env);
  const origins = allowedCorsOrigins(env);

  app.disable("x-powered-by"); app.set("trust proxy", 1); app.use(pinoHttp({ logger }));
  app.use(cors({ origin(origin, callback) { const normalized = normalizeOrigin(origin); if (!normalized || origins.has(normalized)) return callback(null, true); return callback(new Error("Origem não autorizada pelo CORS.")); }, credentials: true, optionsSuccessStatus: 204 }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", storage: repository.constructor.name, timestamp: new Date().toISOString() }));
  app.use("/api/auth", authRoutes(createAuthController(repository, auth.signLocalToken, emailService, env), auth));
  const imports = importRoutes(createImportController(repository, emailService, env), auth, env);
  app.use("/api/imports", imports); app.use("/api/uploads", imports);
  app.use("/api/analyses", analysisRoutes(createAnalysisController(repository), auth));
  app.use("/api/users", userRoutes(createUserController(repository, emailService, env), auth));

  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
  app.use((error: Error & { code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err: error }, "request_failed");
    const clientError = /Nenhuma análise|Apenas arquivos|File too large|Já existe|Duplicate entry|Origem não autorizada/i.test(error.message);
    return res.status(clientError ? 400 : 500).json({ error: clientError ? error.message : "Não foi possível concluir a operação." });
  });
  return { app, repository };
}
