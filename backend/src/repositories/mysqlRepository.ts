import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AnalysisSchema, AnalysisTypeRecord, AppUser, ImportLogInput, ImportRecord, ParsedWorkbook, Repository, Scalar, UserRole } from "../types.js";

const jsonValue = <T>(value: unknown): T => typeof value === "string" ? JSON.parse(value) as T : value as T;
const userFromRow = (row: RowDataPacket): AppUser => ({ ...row, id: Number(row.id), ativo: Boolean(row.ativo) } as AppUser);
const analysisFromRow = (row: RowDataPacket): AnalysisTypeRecord => ({ ...row, id: Number(row.id), ativo: Boolean(row.ativo), schema_json: jsonValue<AnalysisSchema>(row.schema_json), filter_config_json: jsonValue(row.filter_config_json) } as AnalysisTypeRecord);

export class MysqlRepository implements Repository {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string) { const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]); return rows[0] ? userFromRow(rows[0]) : null; }
  async getUserById(id: number) { const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]); return rows[0] ? userFromRow(rows[0]) : null; }
  async listUsers() { const [rows] = await this.pool.query<RowDataPacket[]>("SELECT id, nome, email, role, ativo, criado_em FROM users ORDER BY nome"); return rows.map(userFromRow); }
  async createLocalUser(input: { name: string; email: string; passwordHash: string; role: UserRole }) {
    const [result] = await this.pool.execute("INSERT INTO users (nome, email, password_hash, role) VALUES (?, ?, ?, ?)", [input.name, input.email.toLowerCase(), input.passwordHash, input.role]);
    return (await this.getUserById(Number((result as { insertId: number }).insertId)))!;
  }
  async setUserActive(id: number, active: boolean) { const [result] = await this.pool.execute("UPDATE users SET ativo = ? WHERE id = ?", [active, id]); return Number((result as { affectedRows: number }).affectedRows) > 0; }
  async updateUserPassword(id: number, passwordHash: string) { await this.pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]); }
  async createPasswordReset(userId: number, tokenHash: string, expiresAt: Date) { await this.pool.execute("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)", [userId, tokenHash, expiresAt]); }
  async consumePasswordReset(tokenHash: string) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE", [tokenHash]);
      if (!rows[0]) { await connection.rollback(); return null; }
      await connection.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?", [tokenHash]);
      await connection.commit();
      return this.getUserById(Number(rows[0].user_id));
    } finally { connection.release(); }
  }

  async createImport(input: { fileName: string; fileBuffer: Buffer; filePath?: string | null; mimeType: string; period: string; userId: number; parsed: ParsedWorkbook; logs: ImportLogInput[] }) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        "INSERT INTO analysis_imports (arquivo, arquivo_mime, arquivo_tamanho, arquivo_caminho, arquivo_blob, periodo, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [input.fileName, input.mimeType, input.fileBuffer.length, input.filePath ?? null, input.fileBuffer, input.period, input.userId],
      );
      const importId = Number((result as { insertId: number }).insertId);
      let totalRows = 0;
      for (const analysis of input.parsed.analyses) {
        await connection.execute(
          `INSERT INTO analysis_types (nome, descricao, slug, tipo_visualizacao, source_sheet, schema_json, filter_config_json, ordem, ativo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
           ON DUPLICATE KEY UPDATE nome=VALUES(nome), descricao=VALUES(descricao), tipo_visualizacao=VALUES(tipo_visualizacao), source_sheet=VALUES(source_sheet), schema_json=VALUES(schema_json), filter_config_json=VALUES(filter_config_json), ordem=VALUES(ordem), ativo=TRUE`,
          [analysis.name, analysis.description, analysis.slug, analysis.visualization, analysis.sourceSheet, JSON.stringify(analysis.schema), JSON.stringify({ filters: analysis.schema.filters }), analysis.order],
        );
        const [typeRows] = await connection.execute<RowDataPacket[]>("SELECT id FROM analysis_types WHERE slug = ?", [analysis.slug]);
        const analysisId = Number(typeRows[0]!.id);
        await this.insertAnalysisRows(connection, analysisId, importId, analysis.rows);
        totalRows += analysis.rows.length;
      }
      for (const log of input.logs) await connection.execute("INSERT INTO import_logs (import_id, nivel, etapa, mensagem, contexto_json) VALUES (?, ?, ?, ?, ?)", [importId, log.level, log.step, log.message, log.context ? JSON.stringify(log.context) : null]);
      await connection.execute("UPDATE analysis_imports SET status='COMPLETED', total_analises=?, total_registros=? WHERE id=?", [input.parsed.analyses.length, totalRows, importId]);
      await connection.commit();
      const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM analysis_imports WHERE id = ?", [importId]);
      return { ...rows[0], id: importId } as ImportRecord;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async recordFailedImport(input: { fileName: string; fileBuffer?: Buffer; filePath?: string | null; mimeType?: string; period: string; userId: number; error: string }) {
    const [result] = await this.pool.execute(
      "INSERT INTO analysis_imports (arquivo, arquivo_mime, arquivo_tamanho, arquivo_caminho, arquivo_blob, periodo, usuario_id, status, erro) VALUES (?, ?, ?, ?, ?, ?, ?, 'FAILED', ?)",
      [input.fileName, input.mimeType ?? null, input.fileBuffer?.length ?? null, input.filePath ?? null, input.fileBuffer ?? null, input.period, input.userId, input.error],
    );
    const id = Number((result as { insertId: number }).insertId);
    await this.pool.execute("INSERT INTO import_logs (import_id, nivel, etapa, mensagem) VALUES (?, 'ERROR', 'PARSER', ?)", [id, input.error]);
    const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM analysis_imports WHERE id=?", [id]);
    return rows[0] as ImportRecord;
  }

  private async insertAnalysisRows(connection: PoolConnection, analysisId: number, importId: number, rows: Record<string, Scalar>[]) {
    for (let offset = 0; offset < rows.length; offset += 500) {
      const chunk = rows.slice(offset, offset + 500);
      const placeholders = chunk.map(() => "(?,?,?,?)").join(",");
      const values = chunk.flatMap((row, index) => [analysisId, importId, offset + index, JSON.stringify(row)]);
      await connection.query(`INSERT INTO analysis_data (analysis_type_id, import_id, row_index, payload_json) VALUES ${placeholders}`, values);
    }
  }

  async listImports() {
    const [rows] = await this.pool.query<RowDataPacket[]>("SELECT id, arquivo, arquivo_mime, arquivo_tamanho, arquivo_caminho, periodo, data_importacao, usuario_id, status, total_analises, total_registros, erro, (arquivo_caminho IS NOT NULL OR arquivo_blob IS NOT NULL) AS arquivo_disponivel FROM analysis_imports ORDER BY id DESC");
    return rows.map((row) => ({ ...row, arquivo_disponivel: Boolean(row.arquivo_disponivel) })) as ImportRecord[];
  }
  async getImportFile(id: number) {
    const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT arquivo, arquivo_mime, arquivo_caminho, arquivo_blob FROM analysis_imports WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];
    if (!row?.arquivo_caminho && !row?.arquivo_blob) return null;
    return { fileName: String(row.arquivo), mimeType: String(row.arquivo_mime || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), filePath: row.arquivo_caminho ? String(row.arquivo_caminho) : null, buffer: row.arquivo_blob as Buffer | null };
  }
  async recordImportDownload(input: { importId: number; userId: number; ip?: string | null; userAgent?: string | null }) {
    await this.pool.execute("INSERT INTO import_download_logs (import_id, usuario_id, ip, user_agent) VALUES (?, ?, ?, ?)", [input.importId, input.userId, input.ip ?? null, input.userAgent ?? null]);
  }
  async deleteImport(id: number) { const [result] = await this.pool.execute("DELETE FROM analysis_imports WHERE id = ?", [id]); return Number((result as { affectedRows: number }).affectedRows) > 0; }
  async listAnalysisTypes(importId?: number) {
    const sql = importId
      ? "SELECT DISTINCT t.* FROM analysis_types t JOIN analysis_data d ON d.analysis_type_id=t.id WHERE t.ativo=TRUE AND d.import_id=? ORDER BY t.ordem, t.nome"
      : "SELECT * FROM analysis_types WHERE ativo=TRUE ORDER BY ordem, nome";
    const [rows] = await this.pool.execute<RowDataPacket[]>(sql, importId ? [importId] : []);
    return rows.map(analysisFromRow);
  }
  async getAnalysisData(slug: string, importId: number) {
    const [typeRows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM analysis_types WHERE slug=? AND ativo=TRUE LIMIT 1", [slug]);
    if (!typeRows[0]) return null;
    const analysis = analysisFromRow(typeRows[0]);
    const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT payload_json FROM analysis_data WHERE analysis_type_id=? AND import_id=? ORDER BY row_index", [analysis.id, importId]);
    return { analysis, rows: rows.map((row) => jsonValue<Record<string, Scalar>>(row.payload_json)) };
  }
  async listImportLogs(importId: number) { const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT nivel, etapa, mensagem, contexto_json, criado_em FROM import_logs WHERE import_id=? ORDER BY id", [importId]); return rows.map((row) => ({ ...row, contexto_json: row.contexto_json ? jsonValue(row.contexto_json) : null })); }
  async recordEmailEvent(input: { type: string; recipient: string; status: string; providerId?: string | null; error?: string | null }) { await this.pool.execute("INSERT INTO email_events (tipo, destinatario, status, provider_id, erro) VALUES (?, ?, ?, ?, ?)", [input.type, input.recipient, input.status, input.providerId ?? null, input.error ?? null]); }
}
