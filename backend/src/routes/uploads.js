import { Router } from "express";
import multer from "multer";

export function uploadRoutes(controller, { authenticate, requireAdmin }, env = process.env) {
  const router = Router();
  const maxBytes = Number(env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      const valid = /\.xlsx$/i.test(file.originalname);
      callback(valid ? null : new Error("Apenas arquivos .xlsx são aceitos."), valid);
    },
  });

  router.use(authenticate);
  router.get("/", controller.list);
  router.post("/", requireAdmin, upload.single("arquivo"), controller.create);
  router.delete("/:id", requireAdmin, controller.remove);
  return router;
}
