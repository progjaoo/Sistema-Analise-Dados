import { Router } from "express";
import type { createAuthController } from "../controllers/authController.js";
import type { createAuthMiddleware } from "../middleware/auth.js";

export function authRoutes(controller: ReturnType<typeof createAuthController>, auth: ReturnType<typeof createAuthMiddleware>) {
  const router = Router();
  router.post("/login", controller.login);
  router.post("/register", controller.register);
  router.post("/forgot-password", controller.forgotPassword);
  router.post("/reset-password", controller.resetPassword);
  router.get("/session", auth.authenticate, controller.session);
  router.get("/me", auth.authenticate, controller.session);
  return router;
}
