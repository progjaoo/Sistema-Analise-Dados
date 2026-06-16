import type { NextFunction, Request, Response } from "express";
import type { AnalysisSchema, Repository, Scalar } from "../types.js";

const validImportId = (req: Request, res: Response) => {
  const value = Number(req.query.import_id);
  if (!Number.isInteger(value) || value <= 0) { res.status(400).json({ error: "O parâmetro import_id é obrigatório." }); return null; }
  return value;
};

function summarize(rows: Record<string, Scalar>[], schema: AnalysisSchema) {
  return Object.fromEntries(schema.yKeys.map((key) => {
    const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const sum = values.reduce((total, value) => total + value, 0);
    return [key, { count: values.length, sum, average: values.length ? sum / values.length : null, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null }];
  }));
}

export function createAnalysisController(repository: Repository) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try { const importId = req.query.import_id ? Number(req.query.import_id) : undefined; return res.json({ analyses: await repository.listAnalysisTypes(importId) }); } catch (error) { return next(error); }
    },
    data: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const importId = validImportId(req, res); if (!importId) return;
        const result = await repository.getAnalysisData(String(req.params.slug), importId);
        if (!result) return res.status(404).json({ error: "Análise não encontrada para esta importação." });
        const allowedFilters = new Set(result.analysis.schema_json.filters);
        const filters = Object.fromEntries(Object.entries(req.query).filter(([key, value]) => key !== "import_id" && allowedFilters.has(key) && value !== undefined).map(([key, value]) => [key, String(value)]));
        const rows = result.rows.filter((row) => Object.entries(filters).every(([key, value]) => String(row[key] ?? "") === value));
        const options = Object.fromEntries(result.analysis.schema_json.filters.map((key) => [key, [...new Set(result.rows.map((row) => row[key]).filter((value) => value !== null).map(String))].sort()]));
        return res.json({ analysis: result.analysis, rows, options, summary: summarize(rows, result.analysis.schema_json) });
      } catch (error) { return next(error); }
    },
  };
}
