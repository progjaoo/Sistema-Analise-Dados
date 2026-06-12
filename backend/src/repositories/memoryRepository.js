const byUpload = (rows, uploadId) => rows.filter((row) => row.upload_id === Number(uploadId));

export class MemoryRepository {
  constructor() {
    this.nextUploadId = 1;
    this.uploads = [];
    this.ranking = [];
    this.maravilhaDiaDia = [];
    this.maravilhaSomatorio = [];
    this.todasEmissoras = [];
    this.competitiva = [];
    this.faixaHoraria = [];
  }

  async createUpload({ fileName, period, userId, parsed }) {
    const upload = {
      id: this.nextUploadId++,
      nome_arquivo: fileName,
      periodo: period,
      data_upload: new Date().toISOString(),
      usuario_id: userId,
      status: "ok",
    };
    this.uploads.push(upload);
    const attach = (rows) => rows.map((row) => ({ ...row, upload_id: upload.id }));
    this.ranking.push(...attach(parsed.ranking));
    this.maravilhaDiaDia.push(...attach(parsed.maravilhaDiaDia));
    this.maravilhaSomatorio.push(...attach(parsed.maravilhaSomatorio));
    this.todasEmissoras.push(...attach(parsed.todasEmissoras));
    this.competitiva.push(...attach(parsed.competitiva));
    this.faixaHoraria.push(...attach(parsed.faixaHoraria));
    return upload;
  }

  async listUploads() {
    return [...this.uploads].sort((a, b) => b.id - a.id);
  }

  async deleteUpload(id) {
    const uploadId = Number(id);
    const before = this.uploads.length;
    this.uploads = this.uploads.filter((item) => item.id !== uploadId);
    for (const key of ["ranking", "maravilhaDiaDia", "maravilhaSomatorio", "todasEmissoras", "competitiva", "faixaHoraria"]) {
      this[key] = this[key].filter((row) => row.upload_id !== uploadId);
    }
    return before !== this.uploads.length;
  }

  async getRanking(uploadId) {
    return byUpload(this.ranking, uploadId).sort((a, b) => a.posicao - b.posicao);
  }

  async getMaravilhaDiaDia(uploadId, day) {
    return byUpload(this.maravilhaDiaDia, uploadId).filter((row) => !day || row.dia_semana === day);
  }

  async getMaravilhaSomatorio(uploadId) {
    return byUpload(this.maravilhaSomatorio, uploadId);
  }

  async getTodasEmissoras(uploadId, station) {
    return byUpload(this.todasEmissoras, uploadId).filter((row) => !station || row.emissora === station);
  }

  async getCompetitiva(uploadId) {
    return byUpload(this.competitiva, uploadId);
  }

  async getFaixaHoraria(uploadId, { day, station }) {
    return byUpload(this.faixaHoraria, uploadId).filter(
      (row) => (!day || row.dia_semana === day) && (!station || row.emissora === station),
    );
  }
}
