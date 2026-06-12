const placeholders = (rowCount, columnCount) =>
  Array.from({ length: rowCount }, () => `(${Array(columnCount).fill("?").join(",")})`).join(",");

async function bulkInsert(connection, table, columns, rows) {
  if (!rows.length) return;
  const values = rows.flatMap((row) => columns.map((column) => row[column] ?? null));
  await connection.query(
    `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders(rows.length, columns.length)}`,
    values,
  );
}

export class MysqlRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findUserByEmail(email) {
    const [rows] = await this.pool.execute(
      "SELECT id, nome, email, senha, perfil FROM usuarios WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0] ?? null;
  }

  async createUpload({ fileName, period, userId, parsed }) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        "INSERT INTO uploads (nome_arquivo, periodo, usuario_id, status) VALUES (?, ?, ?, 'processando')",
        [fileName, period, userId],
      );
      const uploadId = result.insertId;
      const attach = (rows) => rows.map((row) => ({ ...row, upload_id: uploadId }));

      await bulkInsert(connection, "ranking_geral", ["upload_id", "posicao", "emissora", "audiencia_opm"], attach(parsed.ranking));
      await bulkInsert(connection, "maravilha_dia_dia", ["upload_id", "bloco_horario", "dia_semana", "audiencia_opm"], attach(parsed.maravilhaDiaDia));
      await bulkInsert(connection, "maravilha_somatorio", ["upload_id", "bloco_horario", "audiencia_total"], attach(parsed.maravilhaSomatorio));
      await bulkInsert(connection, "todas_emissoras_dia", ["upload_id", "emissora", "dia_semana", "audiencia_opm"], attach(parsed.todasEmissoras));
      await bulkInsert(connection, "analise_competitiva", ["upload_id", "bloco_horario", "emissora", "audiencia_opm"], attach(parsed.competitiva));
      await bulkInsert(connection, "faixa_horaria_concorrentes", ["upload_id", "parte_do_dia", "dia_semana", "emissora", "audiencia_opm"], attach(parsed.faixaHoraria));

      await connection.execute("UPDATE uploads SET status = 'ok' WHERE id = ?", [uploadId]);
      await connection.commit();
      const [rows] = await this.pool.execute("SELECT * FROM uploads WHERE id = ?", [uploadId]);
      return rows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async listUploads() {
    const [rows] = await this.pool.query("SELECT * FROM uploads ORDER BY id DESC");
    return rows;
  }

  async deleteUpload(id) {
    const [result] = await this.pool.execute("DELETE FROM uploads WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }

  async getRanking(uploadId) {
    const [rows] = await this.pool.execute("SELECT posicao, emissora, audiencia_opm FROM ranking_geral WHERE upload_id = ? ORDER BY posicao", [uploadId]);
    return rows;
  }

  async getMaravilhaDiaDia(uploadId, day) {
    const [rows] = await this.pool.execute(
      `SELECT bloco_horario, dia_semana, audiencia_opm FROM maravilha_dia_dia
       WHERE upload_id = ? AND (? IS NULL OR dia_semana = ?) ORDER BY id`,
      [uploadId, day || null, day || null],
    );
    return rows;
  }

  async getMaravilhaSomatorio(uploadId) {
    const [rows] = await this.pool.execute("SELECT bloco_horario, audiencia_total FROM maravilha_somatorio WHERE upload_id = ? ORDER BY id", [uploadId]);
    return rows;
  }

  async getTodasEmissoras(uploadId, station) {
    const [rows] = await this.pool.execute(
      `SELECT emissora, dia_semana, audiencia_opm FROM todas_emissoras_dia
       WHERE upload_id = ? AND (? IS NULL OR emissora = ?) ORDER BY id`,
      [uploadId, station || null, station || null],
    );
    return rows;
  }

  async getCompetitiva(uploadId) {
    const [rows] = await this.pool.execute("SELECT bloco_horario, emissora, audiencia_opm FROM analise_competitiva WHERE upload_id = ? ORDER BY id", [uploadId]);
    return rows;
  }

  async getFaixaHoraria(uploadId, { day, station }) {
    const [rows] = await this.pool.execute(
      `SELECT parte_do_dia, dia_semana, emissora, audiencia_opm FROM faixa_horaria_concorrentes
       WHERE upload_id = ? AND (? IS NULL OR dia_semana = ?) AND (? IS NULL OR emissora = ?) ORDER BY id`,
      [uploadId, day || null, day || null, station || null, station || null],
    );
    return rows;
  }
}
