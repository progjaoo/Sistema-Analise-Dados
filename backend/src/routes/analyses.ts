import { Router } from "express";
import type { createAnalysisController } from "../controllers/analysisController.js";
import type { createAuthMiddleware } from "../middleware/auth.js";

export function analysisRoutes(controller: ReturnType<typeof createAnalysisController>, auth: ReturnType<typeof createAuthMiddleware>) {
  const router = Router(); router.use(auth.authenticate); router.get("/", controller.list); router.get("/:slug/data", controller.data); return router;
}
