import cors from "cors";
import express from "express";
import { createAuthController } from "./controllers/authController.js";
import { createDashboardController } from "./controllers/dashboardController.js";
import { createUploadController } from "./controllers/uploadController.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createRepository } from "./repositories/index.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { uploadRoutes } from "./routes/uploads.js";

export function createApp({ repository = createRepository(), env = process.env } = {}) {
  const app = express();
  const auth = createAuthMiddleware(env);
  const allowedOrigins = (env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
      return callback(new Error("Origem não autorizada pelo CORS."));
    },
  }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", storage: repository.constructor.name }));
  app.use("/api/auth", authRoutes(createAuthController({ repository, secret: auth.secret, env }), auth.authenticate));
  app.use("/api/uploads", uploadRoutes(createUploadController(repository), auth, env));
  app.use("/api/dashboard", dashboardRoutes(createDashboardController(repository), auth.authenticate));

  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    const isClientError = /Abas obrigatórias|Cabeçalho não encontrado|Apenas arquivos|Seções sem dados|File too large/i.test(error.message);
    res.status(isClientError ? 400 : 500).json({ error: isClientError ? error.message : "Não foi possível concluir a operação." });
  });

  return { app, repository };
}
