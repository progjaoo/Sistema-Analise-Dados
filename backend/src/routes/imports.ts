import { Router } from "express";
import multer from "multer";
import type { createImportController } from "../controllers/importController.js";
import type { createAuthMiddleware } from "../middleware/auth.js";

export function importRoutes(controller: ReturnType<typeof createImportController>, auth: ReturnType<typeof createAuthMiddleware>, env = process.env) {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => { if (/\.xlsx$/i.test(file.originalname)) callback(null, true); else callback(new Error("Apenas arquivos .xlsx são aceitos.")); } });
  const router = Router(); router.use(auth.authenticate); router.get("/", controller.list); router.get("/:id/download", controller.download); router.get("/:id/logs", controller.logs); router.post("/", auth.requireEditor, upload.single("arquivo"), controller.create); router.delete("/:id", auth.requireAdmin, controller.remove); return router;
}
