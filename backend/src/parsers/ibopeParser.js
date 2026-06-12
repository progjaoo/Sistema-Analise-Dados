import XLSX from "xlsx";

export const REQUIRED_SHEETS = [
  "RANKING GERAL",
  "MARAVILHA FM - DIA A DIA",
  "MARAVILHA FM - SOMATORIO",
  "TODAS EMISSORAS - DIA A DIA",
  "ANALISE COMPETITIVA",
  "ANALISE POR FAIXA HORÁRIA CONCO",
];

const DAYS = {
  SEGUNDA: "SEGUNDA",
  TERCA: "TERCA",
  QUARTA: "QUARTA",
  QUINTA: "QUINTA",
  SEXTA: "SEXTA",
  SABADO: "SABADO",
  DOMINGO: "DOMINGO",
};

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const audience = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed !== 0 ? Math.round(parsed * 100) / 100 : null;
};

const rowsFromSheet = (sheet) =>
  XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

const findHeader = (rows, tokens) => {
  const index = rows.findIndex((row) => {
    const values = row.map(normalize);
    return tokens.every((token) => values.some((value) => value.includes(token)));
  });
  if (index < 0) throw new Error(`Cabeçalho não encontrado: ${tokens.join(", ")}`);
  return index;
};

const columnByToken = (row, token) =>
  row.findIndex((cell) => normalize(cell).includes(token));

const resolveSheet = (workbook, expectedName) => {
  const exact = workbook.Sheets[expectedName];
  if (exact) return exact;
  const actualName = workbook.SheetNames.find(
    (name) => normalize(name) === normalize(expectedName),
  );
  return actualName ? workbook.Sheets[actualName] : null;
};

const parseRanking = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const headerIndex = findHeader(rows, ["POSICAO", "EMISSORA", "AUDIENCIA"]);
  const header = rows[headerIndex];
  const positionColumn = columnByToken(header, "POSICAO");
  const stationColumn = columnByToken(header, "EMISSORA");
  const audienceColumn = columnByToken(header, "AUDIENCIA");

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const emissora = String(row[stationColumn] ?? "").trim();
    const posicao = Number(row[positionColumn]);
    if (!emissora || !Number.isFinite(posicao)) return [];
    return [{ posicao, emissora, audiencia_opm: audience(row[audienceColumn]) }];
  });
};

const parseMaravilhaDiaDia = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const headerIndex = findHeader(rows, ["BLOCO HORARIO", "SEGUNDA", "DOMINGO"]);
  const header = rows[headerIndex];
  const blockColumn = columnByToken(header, "BLOCO HORARIO");
  const dayColumns = header.flatMap((cell, column) => {
    const day = DAYS[normalize(cell)];
    return day ? [{ day, column }] : [];
  });

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const bloco_horario = String(row[blockColumn] ?? "").trim();
    if (!bloco_horario) return [];
    return dayColumns.map(({ day, column }) => ({
      bloco_horario,
      dia_semana: day,
      audiencia_opm: audience(row[column]),
    }));
  });
};

const parseMaravilhaSomatorio = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const headerIndex = findHeader(rows, ["BLOCO HORARIO", "TODOS OS DIAS"]);
  const header = rows[headerIndex];
  const blockColumn = columnByToken(header, "BLOCO HORARIO");
  const audienceColumn = columnByToken(header, "TODOS OS DIAS");

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const bloco_horario = String(row[blockColumn] ?? "").trim();
    if (!bloco_horario) return [];
    return [{ bloco_horario, audiencia_total: audience(row[audienceColumn]) }];
  });
};

const parseTodasEmissoras = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const headerIndex = findHeader(rows, ["EMISSORA", "SEGUNDA", "DOMINGO"]);
  const header = rows[headerIndex];
  const stationColumn = columnByToken(header, "EMISSORA");
  const dayColumns = header.flatMap((cell, column) => {
    const day = DAYS[normalize(cell)];
    return day ? [{ day, column }] : [];
  });

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const emissora = String(row[stationColumn] ?? "").trim();
    if (!emissora) return [];
    return dayColumns.map(({ day, column }) => ({
      emissora,
      dia_semana: day,
      audiencia_opm: audience(row[column]),
    }));
  });
};

const parseCompetitiva = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const headerIndex = findHeader(rows, ["BLOCO HORARIO", "93 FM", "MELODIA", "MARAVILHA"]);
  const header = rows[headerIndex];
  const blockColumn = columnByToken(header, "BLOCO HORARIO");
  const stationColumns = header.flatMap((cell, column) => {
    const emissora = String(cell ?? "").trim();
    return /93 FM|MELODIA|MARAVILHA/i.test(emissora) ? [{ emissora, column }] : [];
  });

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const bloco_horario = String(row[blockColumn] ?? "").trim();
    if (!bloco_horario) return [];
    return stationColumns.map(({ emissora, column }) => ({
      bloco_horario,
      emissora,
      audiencia_opm: audience(row[column]),
    }));
  });
};

const parseFaixaHoraria = (sheet) => {
  const rows = rowsFromSheet(sheet);
  const stationHeaderIndex = findHeader(rows, ["PARTES DO DIA", "93 FM", "MELODIA", "MARAVILHA"]);
  const stationHeader = rows[stationHeaderIndex];
  const dayHeader = rows[stationHeaderIndex - 1] ?? [];
  const partColumn = columnByToken(stationHeader, "PARTES DO DIA");
  let currentDay = null;
  const columns = [];

  for (let column = partColumn + 1; column < stationHeader.length; column += 1) {
    const dayCandidate = DAYS[normalize(dayHeader[column])];
    if (dayCandidate) currentDay = dayCandidate;
    const emissora = String(stationHeader[column] ?? "").trim();
    if (currentDay && /93 FM|MELODIA|MARAVILHA/i.test(emissora)) {
      columns.push({ column, dia_semana: currentDay, emissora });
    }
  }

  return rows.slice(stationHeaderIndex + 1).flatMap((row) => {
    const parte_do_dia = String(row[partColumn] ?? "").trim();
    if (!parte_do_dia) return [];
    return columns.map(({ column, dia_semana, emissora }) => ({
      parte_do_dia,
      dia_semana,
      emissora,
      audiencia_opm: audience(row[column]),
    }));
  });
};

export function parseIbopeWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const missingSheets = REQUIRED_SHEETS.filter((name) => !resolveSheet(workbook, name));
  if (missingSheets.length) {
    throw new Error(`Abas obrigatórias ausentes: ${missingSheets.join(", ")}`);
  }

  const parsed = {
    ranking: parseRanking(resolveSheet(workbook, REQUIRED_SHEETS[0])),
    maravilhaDiaDia: parseMaravilhaDiaDia(resolveSheet(workbook, REQUIRED_SHEETS[1])),
    maravilhaSomatorio: parseMaravilhaSomatorio(resolveSheet(workbook, REQUIRED_SHEETS[2])),
    todasEmissoras: parseTodasEmissoras(resolveSheet(workbook, REQUIRED_SHEETS[3])),
    competitiva: parseCompetitiva(resolveSheet(workbook, REQUIRED_SHEETS[4])),
    faixaHoraria: parseFaixaHoraria(resolveSheet(workbook, REQUIRED_SHEETS[5])),
  };

  const emptySections = Object.entries(parsed)
    .filter(([, values]) => values.length === 0)
    .map(([key]) => key);
  if (emptySections.length) {
    throw new Error(`Seções sem dados após o processamento: ${emptySections.join(", ")}`);
  }

  return parsed;
}
