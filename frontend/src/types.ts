export type Scalar = string | number | boolean | null;
export type VisualizationType = "table" | "line" | "bar" | "area" | "pie" | "kpi";
export type UserRole = "ADMIN" | "ANALYST" | "VIEWER";
export interface User { id: number; nome: string; email: string; role: UserRole; ativo?: boolean; }
export interface AnalysisColumn { key: string; label: string; type: "string" | "number" | "date" | "boolean"; role: "dimension" | "metric"; }
export interface AnalysisSchema { columns: AnalysisColumn[]; xKey: string | null; yKeys: string[]; filters: string[]; }
export interface AnalysisType { id: number; nome: string; descricao: string; slug: string; tipo_visualizacao: VisualizationType; source_sheet: string; schema_json: AnalysisSchema; ordem: number; }
export interface ImportRecord { id: number; arquivo: string; arquivo_mime?: string | null; arquivo_tamanho?: number | null; arquivo_caminho?: string | null; arquivo_disponivel?: boolean; periodo: string; data_importacao: string; status: string; total_analises: number; total_registros: number; erro?: string | null; }
export interface AnalysisResponse { analysis: AnalysisType; rows: Record<string, Scalar>[]; options: Record<string, string[]>; summary: Record<string, { count: number; sum: number; average: number | null; min: number | null; max: number | null }>; }
