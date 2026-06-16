import type { NextFunction, Request, Response } from "express";
import { parseDynamicWorkbook } from "../parsers/dynamicWorkbookParser.js";
import { readStoredFile, saveImportFile } from "../services/fileStorage.js";
import type { Repository } from "../types.js";
import type { createEmailService } from "../services/email/index.js";

const contentDisposition = (fileName: string) => {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

export function createImportController(repository: Repository, emailService: ReturnType<typeof createEmailService>, env = process.env) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      const startedAt = Date.now();
      let savedFilePath: string | null = null;
      try {
        if (!req.file) return res.status(400).json({ error: "Selecione um arquivo .xlsx." });
        const period = String(req.body?.periodo ?? "").trim();
        if (!period) return res.status(400).json({ error: "Informe o período de referência." });
        savedFilePath = await saveImportFile({ fileName: req.file.originalname, buffer: req.file.buffer, env });
        const parsed = parseDynamicWorkbook(req.file.buffer);
        const logs = [
          { level: "INFO" as const, step: "DETECTION", message: `${parsed.analyses.length} análises detectadas.`, context: { sheets: parsed.analyses.map((analysis) => analysis.sourceSheet) } },
          ...parsed.warnings.map((message) => ({ level: "WARNING" as const, step: "PARSER", message })),
          { level: "INFO" as const, step: "PERSISTENCE", message: "Metadados e dados persistidos com sucesso.", context: { duration_ms: Date.now() - startedAt } },
        ];
        const imported = await repository.createImport({ fileName: req.file.originalname, fileBuffer: req.file.buffer, filePath: savedFilePath, mimeType: req.file.mimetype, period, userId: req.user!.id, parsed, logs });
        await emailService.send(req.user!.email, "importCompleted", period, parsed.analyses.length).catch(() => null);
        return res.status(201).json({ import: imported, analyses: parsed.analyses.map((analysis) => ({ slug: analysis.slug, name: analysis.name, visualization: analysis.visualization, rows: analysis.rows.length })), warnings: parsed.warnings });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        if (req.user && req.file) {
          savedFilePath ??= await saveImportFile({ fileName: req.file.originalname, buffer: req.file.buffer, env }).catch(() => null);
          await repository.recordFailedImport({ fileName: req.file.originalname, fileBuffer: req.file.buffer, filePath: savedFilePath, mimeType: req.file.mimetype, period: String(req.body?.periodo ?? "Não informado"), userId: req.user.id, error: message }).catch(() => null);
        }
        if (req.user) await emailService.send(req.user.email, "importFailed", req.file?.originalname ?? "arquivo", message).catch(() => null);
        return next(error);
      }
    },
    list: async (_req: Request, res: Response, next: NextFunction) => { try { const imports = await repository.listImports(); return res.json({ imports, uploads: imports }); } catch (error) { return next(error); } },
    download: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const file = await repository.getImportFile(Number(req.params.id));
        if (!file) return res.status(404).json({ error: "Arquivo original não disponível para esta importação." });
        const buffer = file.filePath ? await readStoredFile(file.filePath).catch(() => null) : file.buffer;
        if (!buffer) return res.status(404).json({ error: "A planilha original não foi encontrada no servidor. Entre em contato com o administrador." });
        await repository.recordImportDownload({ importId: Number(req.params.id), userId: req.user!.id, ip: req.ip, userAgent: req.get("user-agent") ?? null }).catch(() => null);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Content-Disposition", contentDisposition(file.fileName));
        return res.send(buffer);
      } catch (error) { return next(error); }
    },
    remove: async (req: Request, res: Response, next: NextFunction) => { try { const removed = await repository.deleteImport(Number(req.params.id)); return removed ? res.status(204).end() : res.status(404).json({ error: "Importação não encontrada." }); } catch (error) { return next(error); } },
    logs: async (req: Request, res: Response, next: NextFunction) => { try { return res.json({ logs: await repository.listImportLogs(Number(req.params.id)) }); } catch (error) { return next(error); } },
  };
}
