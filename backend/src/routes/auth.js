import { Router } from "express";

export function authRoutes(controller, authenticate) {
  const router = Router();
  router.post("/login", controller.login);
  router.get("/me", authenticate, controller.me);
  return router;
}
