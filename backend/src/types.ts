export type VisualizationType = "table" | "line" | "bar" | "area" | "pie" | "kpi";
export type UserRole = "ADMIN" | "ANALYST" | "VIEWER";
export type Scalar = string | number | boolean | null;

export interface AnalysisColumn {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "boolean";
  role: "dimension" | "metric";
}

export interface AnalysisSchema {
  columns: AnalysisColumn[];
  xKey: string | null;
  yKeys: string[];
  filters: string[];
}

export interface ParsedAnalysis {
  name: string;
  description: string;
  slug: string;
  visualization: VisualizationType;
  sourceSheet: string;
  order: number;
  schema: AnalysisSchema;
  rows: Record<string, Scalar>[];
  warnings: string[];
}

export interface ParsedWorkbook {
  analyses: ParsedAnalysis[];
  warnings: string[];
}

export interface AppUser {
  id: number;
  nome: string;
  email: string;
  password_hash?: string | null;
  role: UserRole;
  ativo: boolean;
  criado_em?: string | Date;
}

export interface ImportRecord {
  id: number;
  arquivo: string;
  arquivo_mime?: string | null;
  arquivo_tamanho?: number | null;
  arquivo_caminho?: string | null;
  arquivo_disponivel?: boolean;
  periodo: string;
  data_importacao: string | Date;
  usuario_id: number | null;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  total_analises: number;
  total_registros: number;
  erro?: string | null;
}

export interface AnalysisTypeRecord {
  id: number;
  nome: string;
  descricao: string | null;
  slug: string;
  tipo_visualizacao: VisualizationType;
  source_sheet: string;
  schema_json: AnalysisSchema;
  filter_config_json: { filters: string[] } | null;
  ordem: number;
  ativo: boolean;
}

export interface ImportLogInput {
  level: "INFO" | "WARNING" | "ERROR";
  step: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface Repository {
  findUserByEmail(email: string): Promise<AppUser | null>;
  getUserById(id: number): Promise<AppUser | null>;
  listUsers(): Promise<AppUser[]>;
  createLocalUser(input: { name: string; email: string; passwordHash: string; role: UserRole }): Promise<AppUser>;
  setUserActive(id: number, active: boolean): Promise<boolean>;
  updateUserPassword(id: number, passwordHash: string): Promise<void>;
  createPasswordReset(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  consumePasswordReset(tokenHash: string): Promise<AppUser | null>;
  createImport(input: { fileName: string; fileBuffer: Buffer; filePath?: string | null; mimeType: string; period: string; userId: number; parsed: ParsedWorkbook; logs: ImportLogInput[] }): Promise<ImportRecord>;
  recordFailedImport(input: { fileName: string; fileBuffer?: Buffer; filePath?: string | null; mimeType?: string; period: string; userId: number; error: string }): Promise<ImportRecord>;
  listImports(): Promise<ImportRecord[]>;
  getImportFile(id: number): Promise<{ fileName: string; mimeType: string; filePath?: string | null; buffer?: Buffer | null } | null>;
  recordImportDownload(input: { importId: number; userId: number; ip?: string | null; userAgent?: string | null }): Promise<void>;
  deleteImport(id: number): Promise<boolean>;
  listAnalysisTypes(importId?: number): Promise<AnalysisTypeRecord[]>;
  getAnalysisData(slug: string, importId: number): Promise<{ analysis: AnalysisTypeRecord; rows: Record<string, Scalar>[] } | null>;
  listImportLogs(importId: number): Promise<Record<string, unknown>[]>;
  recordEmailEvent(input: { type: string; recipient: string; status: string; providerId?: string | null; error?: string | null }): Promise<void>;
}
