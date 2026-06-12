export const DAYS = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"];
export const DAY_LABELS = {
  SEGUNDA: "Seg",
  TERCA: "Ter",
  QUARTA: "Qua",
  QUINTA: "Qui",
  SEXTA: "Sex",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

export const STATION_COLORS = {
  "GRJ - MARAVILHA FM/WEB": "#FF8000",
  "GRJ - 93 FM/WEB": "#2563EB",
  "GRJ - MELODIA FM/WEB": "#7C3AED",
};

export const formatOpm = (value, maximumFractionDigits = 0) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);

export const shortStation = (name) =>
  name
    .replace(/^GRJ - /, "")
    .replace(/ FM\/WEB$/, "")
    .replace(/\/WEB$/, "");

export const pivot = (rows, rowKey, columnKey, valueKey) => {
  const map = new Map();
  for (const row of rows) {
    const key = row[rowKey];
    if (!map.has(key)) map.set(key, { [rowKey]: key });
    map.get(key)[row[columnKey]] = row[valueKey];
  }
  return [...map.values()];
};

export const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(";"), ...rows.map((row) => headers.map((header) => escape(row[header])).join(";"))].join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
