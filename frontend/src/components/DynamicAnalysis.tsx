import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, errorMessage } from "../api/client.js";
import type { AnalysisColumn, AnalysisResponse, Scalar } from "../types.js";
import { ErrorState, Kpi, Loading, Panel } from "./ui.js";

const COLORS = ["#FF8000", "#2563EB", "#7C3AED", "#10B981", "#DC2626", "#F59E0B", "#334155", "#0891B2", "#DB2777"];
const format = (value: Scalar) => typeof value === "number" ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value) : String(value ?? "—");
const axis = { fontSize: 10, fill: "#64748b" };

function chartDataset(data: AnalysisResponse) {
  const { rows, analysis } = data; const schema = analysis.schema_json; const xKey = schema.xKey;
  if (!xKey || !rows.length) return { rows, series: schema.yKeys };
  if (schema.yKeys.length !== 1) return { rows, series: schema.yKeys };
  const metric = schema.yKeys[0]!;
  const dimensions = schema.columns.filter((column) => column.role === "dimension" && column.key !== xKey);
  if (!dimensions.length) return { rows, series: [metric] };
  const grouped = new Map<string, Record<string, Scalar>>(); const series = new Set<string>();
  for (const row of rows) {
    const x = String(row[xKey] ?? ""); const name = dimensions.map((column) => String(row[column.key] ?? "")).filter(Boolean).join(" / ") || metric;
    series.add(name); const item = grouped.get(x) ?? { [xKey]: row[xKey] ?? null }; item[name] = row[metric] ?? null; grouped.set(x, item);
  }
  return { rows: [...grouped.values()], series: [...series] };
}

function Chart({ data }: { data: AnalysisResponse }) {
  const { analysis } = data; const schema = analysis.schema_json; const prepared = chartDataset(data); const xKey = schema.xKey || schema.columns[0]?.key || "";
  const common = <><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false}/><XAxis dataKey={xKey} tick={axis}/><YAxis tick={axis}/><Tooltip formatter={(value) => format(value as Scalar)}/><Legend/></>;
  if (analysis.tipo_visualizacao === "pie") { const metric = schema.yKeys[0]; return <ResponsiveContainer width="100%" height={420} minWidth={1}><PieChart><Tooltip formatter={(value) => format(value as Scalar)}/><Legend/><Pie data={data.rows} dataKey={metric} nameKey={xKey} outerRadius="78%" label>{data.rows.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]}/>)}</Pie></PieChart></ResponsiveContainer>; }
  if (analysis.tipo_visualizacao === "line") return <ResponsiveContainer width="100%" height={420} minWidth={1}><LineChart data={prepared.rows}>{common}{prepared.series.map((key, index) => <Line key={key} dataKey={key} type="monotone" connectNulls stroke={COLORS[index % COLORS.length]} dot={false} strokeWidth={2}/>)}</LineChart></ResponsiveContainer>;
  if (analysis.tipo_visualizacao === "area") return <ResponsiveContainer width="100%" height={420} minWidth={1}><AreaChart data={prepared.rows}>{common}{prepared.series.map((key, index) => <Area key={key} dataKey={key} type="monotone" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={.15}/>)}</AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={420} minWidth={1}><BarChart data={prepared.rows}>{common}{prepared.series.map((key, index) => <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4,4,0,0]}/>)}</BarChart></ResponsiveContainer>;
}

function DataTable({ rows, columns }: { rows: Record<string, Scalar>[]; columns: AnalysisColumn[] }) { return <div className="max-h-[620px] overflow-auto"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key} className={column.type === "number" ? "text-right" : ""}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.key} className={column.type === "number" ? "text-right font-semibold" : ""}>{format(row[column.key] ?? null)}</td>)}</tr>)}</tbody></table></div>; }

export function DynamicAnalysis({ slug, importId }: { slug: string; importId: number }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useQuery<AnalysisResponse>({ queryKey: ["analysis-data", slug, importId, filters], queryFn: async () => (await api.get(`/analyses/${slug}/data`, { params: { import_id: importId, ...filters } })).data });
  const data = query.data; const columns = useMemo(() => data?.analysis.schema_json.columns ?? [], [data]);
  if (query.isLoading) return <Loading/>; if (query.isError || !data) return <ErrorState message={errorMessage(query.error)}/>;
  const metrics = data.analysis.schema_json.yKeys;
  const changeFilter = (key: string, value: string) => setFilters((current) => { const next = { ...current }; if (value) next[key] = value; else delete next[key]; return next; });
  return <div className="space-y-5">
    {!!data.analysis.schema_json.filters.length && <Panel title="Filtros"><div className="flex flex-wrap gap-3">{data.analysis.schema_json.filters.map((key) => { const column = columns.find((item) => item.key === key); return <label className="select-wrap" key={key}><span>{column?.label || key}</span><select value={filters[key] || ""} onChange={(event) => changeFilter(key, event.target.value)}><option value="">Todos</option>{data.options[key]?.map((value) => <option key={value}>{value}</option>)}</select></label>; })}</div></Panel>}
    {data.analysis.tipo_visualizacao === "kpi" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((key) => { const column = columns.find((item) => item.key === key); return <Kpi key={key} label={column?.label || key} value={format(data.summary[key]?.sum ?? null)} detail={`Média: ${format(data.summary[key]?.average ?? null)}`}/>; })}</div> : data.analysis.tipo_visualizacao !== "table" && <Panel title={data.analysis.nome} subtitle={`${data.rows.length} registros • origem: ${data.analysis.source_sheet}`}><div className="min-h-[420px] min-w-0"><Chart data={data}/></div></Panel>}
    <Panel title="Dados da análise" subtitle="Tabela completa gerada a partir dos metadados do Excel"><DataTable rows={data.rows} columns={columns}/></Panel>
  </div>;
}
