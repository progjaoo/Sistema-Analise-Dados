import type { AnalysisTypeRecord, AppUser, ImportLogInput, ImportRecord, ParsedWorkbook, Repository, Scalar, UserRole } from "../types.js";

export class MemoryRepository implements Repository {
  private nextUserId = 1;
  private nextImportId = 1;
  private nextAnalysisId = 1;
  private users: AppUser[] = [];
  private imports: ImportRecord[] = [];
  private files = new Map<number, { fileName: string; mimeType: string; buffer: Buffer }>();
  private analyses: AnalysisTypeRecord[] = [];
  private data: Array<{ analysisId: number; importId: number; rows: Record<string, Scalar>[] }> = [];
  private logs = new Map<number, Record<string, unknown>[]>();
  private resets = new Map<string, { userId: number; expiresAt: Date }>();

  async findUserByEmail(email: string) { return this.users.find((user) => user.email === email.toLowerCase()) ?? null; }
  async getUserById(id: number) { return this.users.find((user) => user.id === id) ?? null; }
  async listUsers() { return this.users.map(({ password_hash: _password, ...user }) => user as AppUser); }
  async createLocalUser(input: { name: string; email: string; passwordHash: string; role: UserRole }) {
    if (await this.findUserByEmail(input.email)) throw new Error("Já existe um usuário com este email.");
    const user: AppUser = { id: this.nextUserId++, nome: input.name, email: input.email.toLowerCase(), password_hash: input.passwordHash, role: input.role, ativo: true };
    this.users.push(user);
    return user;
  }
  async setUserActive(id: number, active: boolean) { const user = await this.getUserById(id); if (!user) return false; user.ativo = active; return true; }
  async updateUserPassword(id: number, passwordHash: string) { const user = await this.getUserById(id); if (user) user.password_hash = passwordHash; }
  async createPasswordReset(userId: number, tokenHash: string, expiresAt: Date) { this.resets.set(tokenHash, { userId, expiresAt }); }
  async consumePasswordReset(tokenHash: string) { const reset = this.resets.get(tokenHash); this.resets.delete(tokenHash); return reset && reset.expiresAt > new Date() ? this.getUserById(reset.userId) : null; }

  async createImport(input: { fileName: string; fileBuffer: Buffer; filePath?: string | null; mimeType: string; period: string; userId: number; parsed: ParsedWorkbook; logs: ImportLogInput[] }) {
    const record: ImportRecord = { id: this.nextImportId++, arquivo: input.fileName, arquivo_mime: input.mimeType, arquivo_tamanho: input.fileBuffer.length, arquivo_caminho: input.filePath, arquivo_disponivel: true, periodo: input.period, data_importacao: new Date().toISOString(), usuario_id: input.userId, status: "COMPLETED", total_analises: input.parsed.analyses.length, total_registros: input.parsed.analyses.reduce((sum, analysis) => sum + analysis.rows.length, 0) };
    this.imports.push(record);
    this.files.set(record.id, { fileName: input.fileName, mimeType: input.mimeType, buffer: input.fileBuffer });
    for (const analysis of input.parsed.analyses) {
      let type = this.analyses.find((item) => item.slug === analysis.slug);
      if (!type) {
        type = { id: this.nextAnalysisId++, nome: analysis.name, descricao: analysis.description, slug: analysis.slug, tipo_visualizacao: analysis.visualization, source_sheet: analysis.sourceSheet, schema_json: analysis.schema, filter_config_json: { filters: analysis.schema.filters }, ordem: analysis.order, ativo: true };
        this.analyses.push(type);
      } else Object.assign(type, { nome: analysis.name, descricao: analysis.description, tipo_visualizacao: analysis.visualization, source_sheet: analysis.sourceSheet, schema_json: analysis.schema, filter_config_json: { filters: analysis.schema.filters }, ordem: analysis.order });
      this.data.push({ analysisId: type.id, importId: record.id, rows: analysis.rows });
    }
    this.logs.set(record.id, input.logs.map((log) => ({ nivel: log.level, etapa: log.step, mensagem: log.message, contexto_json: log.context ?? null, criado_em: new Date().toISOString() })));
    return record;
  }
  async recordFailedImport(input: { fileName: string; fileBuffer?: Buffer; filePath?: string | null; mimeType?: string; period: string; userId: number; error: string }) {
    const record: ImportRecord = { id: this.nextImportId++, arquivo: input.fileName, arquivo_mime: input.mimeType ?? null, arquivo_tamanho: input.fileBuffer?.length ?? null, arquivo_caminho: input.filePath, arquivo_disponivel: Boolean(input.fileBuffer || input.filePath), periodo: input.period, data_importacao: new Date().toISOString(), usuario_id: input.userId, status: "FAILED", total_analises: 0, total_registros: 0, erro: input.error };
    this.imports.push(record); this.logs.set(record.id, [{ nivel: "ERROR", etapa: "PARSER", mensagem: input.error, criado_em: new Date().toISOString() }]); return record;
  }
  async listImports() { return [...this.imports].sort((a, b) => b.id - a.id); }
  async getImportFile(id: number) { return this.files.get(id) ?? null; }
  async recordImportDownload() {}
  async deleteImport(id: number) { const before = this.imports.length; this.imports = this.imports.filter((item) => item.id !== Number(id)); this.data = this.data.filter((item) => item.importId !== Number(id)); this.files.delete(Number(id)); return before !== this.imports.length; }
  async listAnalysisTypes(importId?: number) { const ids = importId ? new Set(this.data.filter((item) => item.importId === importId).map((item) => item.analysisId)) : null; return this.analyses.filter((item) => item.ativo && (!ids || ids.has(item.id))).sort((a, b) => a.ordem - b.ordem); }
  async getAnalysisData(slug: string, importId: number) { const analysis = this.analyses.find((item) => item.slug === slug); if (!analysis) return null; const item = this.data.find((entry) => entry.analysisId === analysis.id && entry.importId === importId); return item ? { analysis, rows: item.rows } : null; }
  async listImportLogs(importId: number) { return this.logs.get(importId) ?? []; }
  async recordEmailEvent() {}
}
