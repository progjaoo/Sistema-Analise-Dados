import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseIbopeWorkbook } from "../src/parsers/ibopeParser.js";

const workbookPath = process.env.IBOPE_FIXTURE_PATH ||
  "/Users/joaomvalente/Documents/Trabalho/ANALISE DE DADOS/Analise ibope - ABRIL/Relatório_Ibope_Abril_MaravilhaFM.xlsx";

describe.skipIf(!fs.existsSync(workbookPath))("parser Ibope real", () => {
  const parsed = parseIbopeWorkbook(fs.readFileSync(workbookPath));

  it("extrai as seis seções nas cardinalidades esperadas", () => {
    expect(parsed.ranking).toHaveLength(21);
    expect(parsed.maravilhaDiaDia).toHaveLength(175);
    expect(parsed.maravilhaSomatorio).toHaveLength(25);
    expect(parsed.todasEmissoras).toHaveLength(140);
    expect(parsed.competitiva).toHaveLength(75);
    expect(parsed.faixaHoraria).toHaveLength(525);
  });

  it("trata audiência zero como nula e preserva os valores reais", () => {
    const zero = parsed.maravilhaDiaDia.find((row) => row.bloco_horario === "05:00/05:59" && row.dia_semana === "TERCA");
    const peak = parsed.maravilhaDiaDia.find((row) => row.bloco_horario === "10:00/10:59" && row.dia_semana === "DOMINGO");
    expect(zero.audiencia_opm).toBeNull();
    expect(peak.audiencia_opm).toBe(13131.19);
  });

  it("expande corretamente os cabeçalhos mesclados da última aba", () => {
    const sunday = parsed.faixaHoraria.find((row) =>
      row.parte_do_dia === "08:00/08:59" && row.dia_semana === "DOMINGO" && /MARAVILHA/.test(row.emissora),
    );
    expect(sunday).toBeDefined();
    expect(sunday.audiencia_opm).toBe(2538.46);
  });
});
