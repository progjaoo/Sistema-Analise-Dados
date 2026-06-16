import fs from "node:fs";
import XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseDynamicWorkbook } from "../src/parsers/dynamicWorkbookParser.js";

const workbookPath = process.env.IBOPE_FIXTURE_PATH || "/Users/joaomvalente/Documents/Trabalho/ANALISE DE DADOS/Analise ibope - ABRIL/Relatório_Ibope_Abril_MaravilhaFM.xlsx";

describe.skipIf(!fs.existsSync(workbookPath))("parser dinâmico no relatório real", () => {
  const parsed = parseDynamicWorkbook(fs.readFileSync(workbookPath));
  it("detecta todas as abas sem lista fixa", () => { expect(parsed.analyses).toHaveLength(6); expect(parsed.analyses.every((analysis) => analysis.rows.length > 0)).toBe(true); });
  it("gera metadados, métricas e visualizações", () => { expect(parsed.analyses.every((analysis) => analysis.schema.columns.length >= 2)).toBe(true); expect(parsed.analyses.some((analysis) => analysis.schema.filters.length > 0)).toBe(true); });
});

it("aceita uma análise inédita sem alteração de código", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["REGIÃO", "PARTICIPAÇÃO"], ["Norte", 22], ["Sul", 31]]), "Participação por Região");
  const parsed = parseDynamicWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
  expect(parsed.analyses[0]?.slug).toBe("participacao-por-regiao");
  expect(parsed.analyses[0]?.rows).toHaveLength(2);
});
