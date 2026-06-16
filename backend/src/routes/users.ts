import { Router } from "express";
import type { createUserController } from "../controllers/userController.js";
import type { createAuthMiddleware } from "../middleware/auth.js";

export function userRoutes(controller: ReturnType<typeof createUserController>, auth: ReturnType<typeof createAuthMiddleware>) {
  const router = Router();
  router.use(auth.authenticate, auth.requireAdmin);
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:id/active", controller.setActive);
  router.patch("/:id/password", controller.updatePassword);
  return router;
}
