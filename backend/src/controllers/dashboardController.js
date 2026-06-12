const uploadId = (req, res) => {
  const value = Number(req.query.upload_id);
  if (!Number.isInteger(value) || value <= 0) {
    res.status(400).json({ error: "O parâmetro upload_id é obrigatório." });
    return null;
  }
  return value;
};

const normalizedFilter = (value) => (value ? String(value).trim().toUpperCase() : null);

export function createDashboardController(repository) {
  return {
    ranking: async (req, res, next) => {
      try {
        const id = uploadId(req, res);
        if (!id) return;
        const data = await repository.getRanking(id);
        const maravilha = data.find((row) => /MARAVILHA/i.test(row.emissora));
        return res.json({ data, summary: { total_emissoras: data.length, maravilha } });
      } catch (error) { return next(error); }
    },
    maravilhaDiaDia: async (req, res, next) => {
      try {
        const id = uploadId(req, res);
        if (!id) return;
        const day = normalizedFilter(req.query.dia_semana);
        const data = await repository.getMaravilhaDiaDia(id, day);
        const valid = data.filter((row) => row.audiencia_opm !== null);
        const peak = valid.reduce((best, row) => !best || row.audiencia_opm > best.audiencia_opm ? row : best, null);
        return res.json({ data, summary: { pico: peak } });
      } catch (error) { return next(error); }
    },
    maravilhaSomatorio: async (req, res, next) => {
      try {
        const id = uploadId(req, res);
        if (!id) return;
        const data = await repository.getMaravilhaSomatorio(id);
        const hourly = data.filter((row) => row.bloco_horario !== "05-05 BL.1H" && row.audiencia_total !== null);
        const total = hourly.reduce((sum, row) => sum + row.audiencia_total, 0);
        const best = hourly.reduce((value, row) => !value || row.audiencia_total > value.audiencia_total ? row : value, null);
        const worst = hourly.reduce((value, row) => !value || row.audiencia_total < value.audiencia_total ? row : value, null);
        return res.json({ data, summary: { total, media: hourly.length ? total / hourly.length : null, melhor: best, pior: worst } });
      } catch (error) { return next(error); }
    },
    todasEmissoras: async (req, res, next) => {
      try {
        const id = uploadId(req, res);
        if (!id) return;
        const data = await repository.getTodasEmissoras(id, req.query.emissora?.trim() || null);
        return res.json({ data });
      } catch (error) { return next(error); }
    },
    competitiva: async (req, res, next) => {
      try {
        const id = uploadId(req, res);
        if (!id) return;
        const data = await repository.getCompetitiva(id);
        const maravilha = data.filter((row) => /MARAVILHA/i.test(row.emissora) && row.audiencia_opm !== null);
        const best = maravilha.reduce((value, row) => !value || row.audiencia_opm > value.audiencia_opm ? row : value, null);
        return res.json({ data, summary: { melhor_bloco_maravilha: best } });
      } catch (error) { return next(error); }
    },
    faixaHoraria: async (req, res, next) => {
      try {
        const id = uploadId(req, res);
        if (!id) return;
        const data = await repository.getFaixaHoraria(id, {
          day: normalizedFilter(req.query.dia_semana),
          station: req.query.emissora?.trim() || null,
        });
        return res.json({ data });
      } catch (error) { return next(error); }
    },
  };
}
