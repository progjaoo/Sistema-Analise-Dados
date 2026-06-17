import XLSX from "xlsx";
import type { AnalysisColumn, ParsedAnalysis, ParsedWorkbook, Scalar, VisualizationType } from "../types.js";

type Matrix = Scalar[][];
type ConfigRow = { slug?: string; name?: string; description?: string; visualization?: VisualizationType; order?: number };

const CONFIG_SHEET_NAMES = new Set(["CONFIG ANALISES", "CONFIGURACAO ANALISES", "ANALYSIS CONFIG"]);
const VISUALIZATIONS = new Set<VisualizationType>(["table", "line", "bar", "area", "pie", "kpi"]);

const plain = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalized = (value: unknown) => plain(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
export const slugify = (value: unknown) => plain(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "analise";
const keyify = (value: unknown) => slugify(value).replace(/-/g, "_");
const nonEmpty = (value: Scalar) => value !== null && value !== "";
function parseNumericText(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /[a-zA-Z]/.test(trimmed)) return null;
  const cleaned = trimmed.replace(/%$/, "").replace(/\s/g, "");
  if (!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)?(?:,\d+)?$|^[+-]?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const normalizedValue = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}
function coerceScalar(value: Scalar): Scalar {
  if (typeof value !== "string") return value;
  const parsed = parseNumericText(value);
  return parsed ?? plain(value);
}
const isNumeric = (value: Scalar) => typeof value === "number" && Number.isFinite(value);
const numericLike = (value: Scalar) => isNumeric(value) || (typeof value === "string" && parseNumericText(value) !== null);

function sheetMatrix(sheet: XLSX.WorkSheet): Matrix {
  const rows = XLSX.utils.sheet_to_json<Scalar[]>(sheet, { header: 1, raw: true, defval: null, blankrows: false });
  for (const merge of sheet["!merges"] ?? []) {
    const source = rows[merge.s.r]?.[merge.s.c] ?? null;
    if (!nonEmpty(source)) continue;
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      rows[row] ??= [];
      for (let column = merge.s.c; column <= merge.e.c; column += 1) rows[row]![column] = source;
    }
  }
  return rows.map((row) => row.map((value) => (value as unknown) instanceof Date ? (value as unknown as Date).toISOString() : coerceScalar(value)));
}

function headerScore(rows: Matrix, index: number) {
  const row = rows[index] ?? [];
  const values = row.filter(nonEmpty);
  if (values.length < 2) return -Infinity;
  const texts = values.filter((value) => typeof value === "string").length;
  const unique = new Set(values.map(normalized)).size;
  const nextRows = rows.slice(index + 1, index + 5);
  const dataSignals = nextRows.reduce((score, next) => score + next.filter(nonEmpty).length, 0);
  const numericSignals = nextRows.reduce((score, next) => score + next.filter(numericLike).length, 0);
  return texts * 8 + unique * 2 + Math.min(dataSignals, 20) + Math.min(numericSignals, 20) - index * 0.2;
}

function findHeaderIndex(rows: Matrix) {
  const limit = Math.min(rows.length, 30);
  let bestIndex = -1;
  let bestScore = -Infinity;
  for (let index = 0; index < limit; index += 1) {
    const score = headerScore(rows, index);
    if (score > bestScore) { bestIndex = index; bestScore = score; }
  }
  return bestIndex;
}

function uniqueHeaders(labels: string[]) {
  const used = new Map<string, number>();
  return labels.map((label, index) => {
    const base = keyify(label || `coluna_${index + 1}`);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return { key: count === 1 ? base : `${base}_${count}`, label: label || `Coluna ${index + 1}` };
  });
}

function extractTable(rows: Matrix, headerIndex: number) {
  const header = rows[headerIndex] ?? [];
  const previous = rows[headerIndex - 1] ?? [];
  const parentLabels: string[] = [];
  let currentParent = "";
  for (let column = 0; column < Math.max(header.length, previous.length); column += 1) {
    if (nonEmpty(previous[column] ?? null)) currentParent = plain(previous[column]);
    parentLabels[column] = currentParent;
  }
  const maxColumn = Math.max(header.length, ...rows.slice(headerIndex + 1).map((row) => row.length));
  const activeColumns = Array.from({ length: maxColumn }, (_, column) => column).filter((column) => rows.slice(headerIndex + 1).some((row) => nonEmpty(row[column] ?? null)));
  const previousDistinct = new Set(previous.filter(nonEmpty).map(normalized)).size;
  const usePrevious = previousDistinct >= 2;
  const labels = activeColumns.map((column) => {
    const current = plain(header[column]);
    const parent = usePrevious ? parentLabels[column] ?? "" : "";
    return parent && normalized(parent) !== normalized(current) ? `${parent} - ${current}` : current;
  });
  const groupedColumns = usePrevious ? activeColumns.filter((column) => nonEmpty(parentLabels[column] ?? null) && nonEmpty(header[column] ?? null) && normalized(parentLabels[column]) !== normalized(header[column])) : [];
  const baseColumns = activeColumns.filter((column) => !groupedColumns.includes(column));
  if (groupedColumns.length >= 2 && new Set(groupedColumns.map((column) => normalized(parentLabels[column]))).size >= 2) {
    const baseHeaders = uniqueHeaders(baseColumns.map((column) => plain(header[column])));
    const groupHeaders = uniqueHeaders(["Grupo", "Série", "Valor"]);
    const dataRows = rows.slice(headerIndex + 1).flatMap((row) => {
      const baseValues = baseColumns.map((column) => row[column] ?? null);
      if (!baseValues.some(nonEmpty)) return [];
      return groupedColumns.flatMap((column) => {
        const value = row[column] ?? null;
        if (!nonEmpty(value)) return [];
        return [Object.fromEntries([
          ...baseHeaders.map((item, index) => [item.key, baseValues[index] ?? null]),
          [groupHeaders[0]!.key, parentLabels[column]],
          [groupHeaders[1]!.key, plain(header[column])],
          [groupHeaders[2]!.key, value],
        ]) as Record<string, Scalar>];
      });
    });
    return { columns: [...baseHeaders, ...groupHeaders], rows: dataRows };
  }
  const columns = uniqueHeaders(labels);
  const dataRows = rows.slice(headerIndex + 1).flatMap((row) => {
    const values = activeColumns.map((column) => row[column] ?? null);
    if (values.filter(nonEmpty).length < Math.min(2, activeColumns.length)) return [];
    return [Object.fromEntries(columns.map((column, index) => [column.key, values[index] ?? null])) as Record<string, Scalar>];
  });
  return { columns, rows: dataRows };
}

function inferColumnType(values: Scalar[]): AnalysisColumn["type"] {
  const present = values.filter(nonEmpty);
  if (present.length && present.every(numericLike)) return "number";
  if (present.length && present.every((value) => typeof value === "boolean")) return "boolean";
  if (present.length && present.every((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))) return "date";
  return "string";
}

function inferVisualization(name: string, columns: AnalysisColumn[], rowCount: number): VisualizationType {
  const metrics = columns.filter((column) => column.type === "number");
  const dimensions = columns.filter((column) => column.type !== "number");
  const text = normalized(name);
  if (!metrics.length) return "table";
  if (rowCount <= 4 && dimensions.length === 0) return "kpi";
  if (metrics.length === 1 && /PARTICIPACAO|DISTRIBUICAO|PERCENTUAL|SHARE/.test(text) && rowCount <= 12) return "pie";
  if (dimensions.some((column) => /DATA|DIA|HORA|HORARIO|FAIXA|BLOCO|MES|PERIODO/.test(normalized(column.label)))) return "line";
  if (metrics.length <= 8 && dimensions.length) return "bar";
  return "table";
}

function parseConfig(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames.find((name) => CONFIG_SHEET_NAMES.has(normalized(name)));
  if (!sheetName) return new Map<string, ConfigRow>();
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]!, { defval: null });
  return new Map(rows.map((row) => {
    const entries = Object.fromEntries(Object.entries(row).map(([key, value]) => [keyify(key), value]));
    const slug = slugify(entries.slug ?? entries.aba ?? entries.nome);
    const visualization = plain(entries.tipo_visualizacao ?? entries.visualizacao).toLowerCase() as VisualizationType;
    return [slug, {
      slug,
      name: plain(entries.nome),
      description: plain(entries.descricao),
      visualization: VISUALIZATIONS.has(visualization) ? visualization : undefined,
      order: Number(entries.ordem) || undefined,
    }];
  }));
}

export function parseDynamicWorkbook(buffer: Buffer): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const config = parseConfig(workbook);
  const warnings: string[] = [];
  const analyses: ParsedAnalysis[] = [];

  workbook.SheetNames.forEach((sheetName, order) => {
    if (CONFIG_SHEET_NAMES.has(normalized(sheetName)) || sheetName.startsWith("__")) return;
    const matrix = sheetMatrix(workbook.Sheets[sheetName]!);
    const headerIndex = findHeaderIndex(matrix);
    if (headerIndex < 0) {
      warnings.push(`Aba "${sheetName}" ignorada: não foi possível identificar uma tabela.`);
      return;
    }
    const table = extractTable(matrix, headerIndex);
    if (!table.rows.length) {
      warnings.push(`Aba "${sheetName}" ignorada: tabela sem registros.`);
      return;
    }
    const columns: AnalysisColumn[] = table.columns.map((column) => {
      const type = inferColumnType(table.rows.map((row) => row[column.key] ?? null));
      const label = normalized(column.label);
      const indexLike = /POSICAO|RANK|ORDEM|(^|\s)ID($|\s)/.test(label);
      const dimensionLike = /EMISSORA|RADIO|VEICULO|ESTACAO|NOME|DIA|SEMANA|DATA|HORA|HORARIO|FAIXA|BLOCO|PERIODO|TURNO|GRUPO|SERIE/.test(label);
      return { ...column, type, role: type === "number" && !indexLike && !dimensionLike ? "metric" : "dimension" };
    });
    for (const column of columns) {
      if (column.type !== "number") continue;
      for (const row of table.rows) row[column.key] = coerceScalar(row[column.key] ?? null);
    }
    const dimensions = columns.filter((column) => column.role === "dimension");
    const metrics = columns.filter((column) => column.role === "metric");
    const filters = dimensions.filter((column) => {
      const values = new Set(table.rows.map((row) => row[column.key]).filter((value): value is Scalar => value !== undefined && nonEmpty(value)).map(String));
      return values.size > 1 && values.size <= 30;
    }).map((column) => column.key);
    const defaultSlug = slugify(sheetName);
    const settings = config.get(defaultSlug) ?? {};
    analyses.push({
      name: settings.name || plain(sheetName),
      description: settings.description || `Análise importada automaticamente da aba ${sheetName}.`,
      slug: settings.slug || defaultSlug,
      visualization: settings.visualization || inferVisualization(sheetName, columns, table.rows.length),
      sourceSheet: sheetName,
      order: settings.order ?? order,
      schema: { columns, xKey: dimensions.find((column) => column.type === "string")?.key ?? dimensions[0]?.key ?? columns[0]?.key ?? null, yKeys: metrics.map((column) => column.key), filters },
      rows: table.rows,
      warnings: [],
    });
  });

  if (!analyses.length) throw new Error("Nenhuma análise tabular foi detectada no arquivo Excel.");
  return { analyses, warnings };
}
