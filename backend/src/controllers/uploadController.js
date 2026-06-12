import { parseIbopeWorkbook } from "../parsers/ibopeParser.js";

export function createUploadController(repository) {
  return {
    create: async (req, res, next) => {
      try {
        if (!req.file) return res.status(400).json({ error: "Selecione um arquivo .xlsx." });
        if (!req.body.periodo?.trim()) return res.status(400).json({ error: "Informe o período de referência." });
        const parsed = parseIbopeWorkbook(req.file.buffer);
        const upload = await repository.createUpload({
          fileName: req.file.originalname,
          period: req.body.periodo.trim(),
          userId: req.user.id,
          parsed,
        });
        return res.status(201).json({ upload, counts: Object.fromEntries(Object.entries(parsed).map(([key, rows]) => [key, rows.length])) });
      } catch (error) {
        return next(error);
      }
    },
    list: async (_req, res, next) => {
      try {
        return res.json({ uploads: await repository.listUploads() });
      } catch (error) {
        return next(error);
      }
    },
    remove: async (req, res, next) => {
      try {
        const removed = await repository.deleteUpload(req.params.id);
        return removed ? res.status(204).end() : res.status(404).json({ error: "Upload não encontrado." });
      } catch (error) {
        return next(error);
      }
    },
  };
}
