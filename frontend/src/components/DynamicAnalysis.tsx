import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "../api/client.js";
import type { AnalysisColumn, AnalysisResponse, Scalar } from "../types.js";
import { ErrorState, Kpi, Loading, Panel } from "./ui.js";

const MARAVILHA = "#D4163C";
const GOLD = "#D4AF37";
const BLUE_93 = "#4A90D9";
const MELODIA = "#9B59B6";
const NEUTRAL = "#94A3B8";
const COLORS = [MARAVILHA, BLUE_93, MELODIA, "#10B981", "#F59E0B", "#334155"];
const PAGE_SIZE = 40;

const dayOrder = [
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

type AudiencePoint = { dayKey: string; dayLabel: string; time: string; station: string; opm: number; source: Record<string, Scalar> };
type RankRow = { name: string; opm: number; position: number; color: string };
type SortState = { key: string; direction: "asc" | "desc" };
type RankingHover = { row: RankRow; x: number; y: number } | null;
type HeatmapHover = { day: string; time: string; opm: number; x: number; y: number } | null;
type DayOption = { key: string; label: string };

const format = (value: Scalar) => typeof value === "number" ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value) : String(value ?? "—");
const lower = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const upper = (value: unknown) => lower(value).toUpperCase();

function numberValue(value: Scalar) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.trim().replace(/%$/, "").replace(/\s/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function findColumn(columns: AnalysisColumn[], candidates: string[]) {
  return columns.find((column) => {
    const text = lower(`${column.key} ${column.label}`);
    return candidates.some((candidate) => text.includes(candidate));
  });
}

function canonicalDay(value: unknown) {
  const text = lower(value);
  if (/segunda|seg($|\b|\.)/.test(text)) return dayOrder[0];
  if (/terca|ter($|\b|\.)/.test(text)) return dayOrder[1];
  if (/quarta|qua($|\b|\.)/.test(text)) return dayOrder[2];
  if (/quinta|qui($|\b|\.)/.test(text)) return dayOrder[3];
  if (/sexta|sex($|\b|\.)/.test(text)) return dayOrder[4];
  if (/sabado|sab($|\b|\.)/.test(text)) return dayOrder[5];
  if (/domingo|dom($|\b|\.)/.test(text)) return dayOrder[6];
  return null;
}

function timeRank(value: string) {
  const match = value.match(/(\d{1,2})(?:[:hH](\d{2}))?/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2] || 0);
}

function isMaravilha(name: string) { return lower(name).includes("maravilha"); }
function is93(name: string) { return /\b93\b/.test(lower(name)) || lower(name).includes("noventa"); }
function isMelodia(name: string) { return lower(name).includes("melodia"); }
function stationColor(name: string, index = 0) {
  if (isMaravilha(name)) return MARAVILHA;
  if (is93(name)) return BLUE_93;
  if (isMelodia(name)) return MELODIA;
  return COLORS[index % COLORS.length] || NEUTRAL;
}

function analysisText(dataOrSlug: AnalysisResponse | string) {
  return typeof dataOrSlug === "string" ? lower(dataOrSlug) : lower(`${dataOrSlug.analysis.nome} ${dataOrSlug.analysis.slug} ${dataOrSlug.analysis.source_sheet}`);
}
function isRanking(dataOrSlug: AnalysisResponse | string) { const text = analysisText(dataOrSlug); return text.includes("ranking") && text.includes("geral"); }
function isDailyMaravilha(dataOrSlug: AnalysisResponse | string) { const text = analysisText(dataOrSlug); return text.includes("maravilha") && text.includes("dia") && !text.includes("somatorio") && !text.includes("ranking"); }
function isSomatorio(dataOrSlug: AnalysisResponse | string) { const text = analysisText(dataOrSlug); return text.includes("maravilha") && (text.includes("somatorio") || text.includes("soma")); }
function isAllStationsDaily(dataOrSlug: AnalysisResponse | string) { const text = analysisText(dataOrSlug); return (text.includes("todas") || text.includes("todos")) && text.includes("emissora") && text.includes("dia"); }
function isTimeRange(dataOrSlug: AnalysisResponse | string) { const text = analysisText(dataOrSlug); return text.includes("faixa") && (text.includes("concorr") || text.includes("conco") || text.includes("horaria") || text.includes("horario")); }
function isCompetitive(dataOrSlug: AnalysisResponse | string) { const text = analysisText(dataOrSlug); return text.includes("competitiva") || (text.includes("93") && text.includes("melodia") && !text.includes("faixa")); }

function unique<T>(values: T[]) { return [...new Set(values.filter(Boolean))] as T[]; }

function audienceColumns(data: AnalysisResponse) {
  const columns = data.analysis.schema_json.columns;
  const dimensions = columns.filter((column) => column.role === "dimension");
  const metrics = columns.filter((column) => column.role === "metric" || data.analysis.schema_json.yKeys.includes(column.key));
  const dayByValues = dimensions.map((column) => ({ column, hits: data.rows.filter((row) => canonicalDay(row[column.key])).length })).sort((a, b) => b.hits - a.hits)[0];
  const dayColumn = dayByValues && dayByValues.hits > 0 ? dayByValues.column : findColumn(dimensions, ["dia", "semana", "data"]);
  const stationColumn = findColumn(dimensions.filter((column) => column.key !== dayColumn?.key), ["emissora", "radio", "veiculo", "estacao", "grupo", "serie", "nome"]);
  const timeColumn = findColumn(dimensions.filter((column) => column.key !== dayColumn?.key && column.key !== stationColumn?.key), ["horario", "hora", "faixa", "bloco", "periodo", "turno"]);
  const metricColumn = findColumn(metrics, ["opm", "audiencia", "ouvintes", "media", "valor", "total"]) || metrics[0];
  return { columns, dimensions, metrics, dayColumn, stationColumn, timeColumn, metricColumn };
}

function audiencePoints(data: AnalysisResponse): AudiencePoint[] {
  const { dayColumn, stationColumn, timeColumn, metricColumn, metrics } = audienceColumns(data);
  const points: AudiencePoint[] = [];
  if (stationColumn && metricColumn) {
    for (const row of data.rows) {
      const day = dayColumn ? canonicalDay(row[dayColumn.key]) : null;
      const station = String(row[stationColumn.key] ?? "").trim();
      const time = String((timeColumn ? row[timeColumn.key] : null) ?? (day?.label || "Geral")).trim();
      if (!station) continue;
      points.push({ dayKey: day?.key || "geral", dayLabel: day?.label || "Geral", time, station, opm: numberValue(row[metricColumn.key] ?? null), source: row });
    }
    return points;
  }
  const stationMetrics = metrics.filter((column) => /MARAVILHA|MELODIA|(^|\s)93(\s|$)|FM|RADIO/.test(upper(column.label)));
  const usableMetrics = stationMetrics.length ? stationMetrics : metrics;
  for (const row of data.rows) {
    const day = dayColumn ? canonicalDay(row[dayColumn.key]) : null;
    const time = String((timeColumn ? row[timeColumn.key] : null) ?? (day?.label || "Geral")).trim();
    for (const metric of usableMetrics) points.push({ dayKey: day?.key || "geral", dayLabel: day?.label || "Geral", time, station: metric.label, opm: numberValue(row[metric.key] ?? null), source: row });
  }
  return points;
}

function rankingRows(data: AnalysisResponse): RankRow[] {
  const { stationColumn, metricColumn, metrics } = audienceColumns(data);
  if (stationColumn && metricColumn) {
    return data.rows.map((row) => ({ name: String(row[stationColumn.key] ?? "").trim(), opm: numberValue(row[metricColumn.key] ?? null) }))
      .filter((row) => row.name)
      .sort((a, b) => b.opm - a.opm)
      .map((row, index) => ({ ...row, position: index + 1, color: isMaravilha(row.name) ? MARAVILHA : index === 0 ? GOLD : NEUTRAL }));
  }
  return metrics.map((metric) => ({ name: metric.label, opm: data.rows.reduce((sum, row) => sum + numberValue(row[metric.key] ?? null), 0) / Math.max(data.rows.length, 1) }))
    .sort((a, b) => b.opm - a.opm)
    .map((row, index) => ({ ...row, position: index + 1, color: isMaravilha(row.name) ? MARAVILHA : index === 0 ? GOLD : NEUTRAL }));
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function createPdfFromJpeg(jpeg: Uint8Array, imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 24;
  const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;
  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im1 Do\nQ\n`;
  const objects: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`],
    [`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"],
    [`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`],
  ];
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets: number[] = [];
  let length = chunks[0].length;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };
  objects.forEach((parts, index) => {
    offsets.push(length);
    push(`${index + 1} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  });
  const xrefOffset = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

function exportSvgAsPdf(svg: SVGSVGElement | null, fileName: string) {
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();
  image.onload = () => {
    const viewBox = svg.viewBox.baseVal;
    const width = Math.round(viewBox.width || svg.clientWidth || 1200);
    const height = Math.round(viewBox.height || svg.clientHeight || 420);
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(2, 2);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const [, base64] = canvas.toDataURL("image/jpeg", 0.92).split(",");
    downloadBlob(createPdfFromJpeg(base64ToBytes(base64), canvas.width, canvas.height), fileName);
  };
  image.src = url;
}

function RankingSkeleton() {
  return <Panel title="Ranking Geral"><div className="ranking-skeleton">{Array.from({ length: 9 }).map((_, index) => <div key={index} className="ranking-skeleton-row"><span style={{ width: `${52 - index * 2}%` }}/><strong style={{ width: `${92 - index * 5}%` }}/></div>)}</div></Panel>;
}

function RankingEmpty() {
  return <Panel title="Ranking Geral"><div className="ranking-empty"><strong>Nenhum dado de ranking encontrado.</strong><span>Importe uma planilha com emissora e OPM para visualizar o ranking.</span></div></Panel>;
}

const RankingGeneralChart = memo(function RankingGeneralChart({ data }: { data: AnalysisResponse }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<RankingHover>(null);
  const rows = useMemo(() => rankingRows(data), [data]);
  if (!rows.length) return <RankingEmpty/>;

  const max = Math.max(...rows.map((row) => row.opm), 1);
  const width = 1320;
  const labelWidth = 500;
  const valueWidth = 110;
  const barMaxWidth = width - labelWidth - valueWidth - 70;
  const rowHeight = 42;
  const top = 32;
  const height = top + rows.length * rowHeight + 28;

  return <Panel title="Ranking Geral" subtitle={`${rows.length} emissoras ordenadas por OPM, do maior para o menor.`}>
    <div className="ranking-toolbar">
      <div className="ranking-legend"><span><i style={{ background: GOLD }}/>Líder</span><span><i style={{ background: MARAVILHA }}/>Maravilha FM</span><span><i style={{ background: NEUTRAL }}/>Demais emissoras</span></div>
      <button className="button-secondary" onClick={() => exportSvgAsPdf(svgRef.current, "ranking-geral-opm.pdf")}>Exportar PDF</button>
    </div>

    <div className="ranking-desktop" onMouseLeave={() => setHover(null)}>
      {hover && <div className="ranking-custom-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}><strong>{hover.row.name}</strong><span>OPM: {format(hover.row.opm)}</span><span>Posição: {hover.row.position}º lugar</span></div>}
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ranking Geral de audiência por OPM">
        <rect width={width} height={height} fill="#ffffff"/>
        {rows.map((row, index) => {
          const y = top + index * rowHeight;
          const barWidth = Math.max(8, (row.opm / max) * barMaxWidth);
          return <g key={`${row.position}-${row.name}`} onMouseMove={(event) => setHover({ row, x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}>
            <text x="16" y={y + 24} fill="#94a3b8" fontSize="12" fontWeight="900">{row.position}º</text>
            <text x="60" y={y + 24} fill="#334155" fontSize="13" fontWeight="800">{row.name}</text>
            <rect x={labelWidth} y={y + 8} width={barMaxWidth} height="24" rx="12" fill="#f1f5f9"/>
            <rect x={labelWidth} y={y + 8} width={barWidth} height="24" rx="12" fill={row.color}/>
            <text x={labelWidth + barWidth + 12} y={y + 25} fill="#111827" fontSize="12" fontWeight="900">{format(row.opm)}</text>
          </g>;
        })}
      </svg>
    </div>

    <div className="ranking-mobile-list">
      {rows.map((row) => <div key={`${row.position}-${row.name}`} className="ranking-mobile-card">
        <div><small>{row.position}º</small><strong>{row.name}</strong></div><b>{format(row.opm)}</b>
        <span><i style={{ width: `${Math.max(4, (row.opm / max) * 100)}%`, background: row.color }}/></span>
      </div>)}
    </div>
  </Panel>;
});

const HorizontalBars = memo(function HorizontalBars({ rows, title }: { rows: RankRow[]; title: string }) {
  const max = Math.max(...rows.map((row) => row.opm), 0) || 1;
  const visible = rows.slice(0, 60);
  return <Panel title={title} subtitle={`${rows.length} emissoras ordenadas por audiência`}> <div className="light-bars">{visible.map((row) => <div key={`${row.position}-${row.name}`} className="light-bar-row" title={`${row.name}\nOPM: ${format(row.opm)}\nPosição: ${row.position}º`}><span className="light-bar-rank">{row.position}º</span><span className="light-bar-name">{row.name}</span><span className="light-bar-track"><i style={{ width: `${Math.max(3, (row.opm / max) * 100)}%`, background: row.color }} /></span><strong>{format(row.opm)}</strong></div>)}</div></Panel>;
});

function heatColor(value: number, max: number) {
  const ratio = max ? Math.max(0, Math.min(1, value / max)) : 0;
  if (ratio < 0.34) return `rgba(15,23,42,${0.35 + ratio})`;
  if (ratio < 0.7) return `rgba(124,58,237,${0.45 + ratio / 2})`;
  return `rgba(212,22,60,${0.55 + ratio / 3})`;
}

function DailySkeleton() {
  return <Panel title="Maravilha FM Dia a Dia"><div className="daily-skeleton"><div/><div/><div/><div/><div/><div/></div></Panel>;
}

function normalizeMaravilhaPoints(data: AnalysisResponse) {
  const points = audiencePoints(data).filter((point) => isMaravilha(point.station) || !point.station || point.station === "Geral");
  const grouped = new Map<string, AudiencePoint>();
  for (const point of points) {
    const key = `${point.dayKey}|${point.time}`;
    const current = grouped.get(key);
    if (!current || point.opm > current.opm) grouped.set(key, point);
  }
  return [...grouped.values()];
}

function DayComparisonLine({ rows, days }: { rows: Record<string, Scalar>[]; days: DayOption[] }) {
  const [hover, setHover] = useState<{ day: string; time: string; opm: number; x: number; y: number } | null>(null);
  const width = 980;
  const height = 300;
  const left = 46;
  const right = 22;
  const top = 18;
  const bottom = 44;
  const values = rows.flatMap((row) => days.map((day) => typeof row[day.key] === "number" ? row[day.key] as number : null)).filter((value): value is number => value !== null);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (index: number) => left + (index / Math.max(rows.length - 1, 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - min) / span) * (height - top - bottom);
  if (!rows.length || !days.length) return <Empty title="Comparativo entre dias" text="Selecione até 2 dias para comparar."/>;
  return <Panel title="Comparativo entre dias" subtitle="Máximo de 2 dias renderizados simultaneamente.">
    <div className="daily-line-wrap" onMouseLeave={() => setHover(null)}>
      {hover && <div className="daily-tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}><strong>{hover.day}</strong><span>Horário: {hover.time}</span><span>OPM: {format(hover.opm)}</span></div>}
      <svg viewBox={`0 0 ${width} ${height}`} className="line-svg" role="img" aria-label="Comparativo de audiência da Maravilha FM entre dias">
        <rect width={width} height={height} fill="#ffffff"/>
        <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#e2e8f0"/>
        <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#e2e8f0"/>
        {days.map((day, dayIndex) => {
          const color = dayIndex === 0 ? MARAVILHA : MELODIA;
          const points = rows.map((row, index) => ({ x: x(index), y: y(typeof row[day.key] === "number" ? row[day.key] as number : min), value: row[day.key], time: String(row.time ?? "") })).filter((point) => typeof point.value === "number");
          const d = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
          return <g key={day.key}>
            <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            {points.map((point) => <circle key={`${day.key}-${point.time}`} cx={point.x} cy={point.y} r="4" fill={color} onMouseMove={(event) => setHover({ day: day.label, time: point.time, opm: point.value as number, x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}/>) }
          </g>;
        })}
        {rows.map((row, index) => index % Math.ceil(rows.length / 10 || 1) === 0 ? <text key={String(row.time)} x={x(index)} y={height - 16} fill="#64748b" fontSize="10" fontWeight="800" textAnchor="middle">{String(row.time)}</text> : null)}
      </svg>
    </div>
    <div className="daily-line-legend">{days.map((day, index) => <span key={day.key}><i style={{ background: index === 0 ? MARAVILHA : MELODIA }}/>{day.label}</span>)}</div>
  </Panel>;
}

function DailyHeatmap({ data }: { data: AnalysisResponse }) {
  const [selectedDayKeys, setSelectedDayKeys] = useState<string[]>([]);
  const [mobileDayKey, setMobileDayKey] = useState("");
  const [hover, setHover] = useState<HeatmapHover>(null);
  const points = useMemo(() => normalizeMaravilhaPoints(data), [data]);
  const times = useMemo(() => unique(points.map((point) => point.time)).sort((a, b) => timeRank(String(a)) - timeRank(String(b)) || String(a).localeCompare(String(b), "pt-BR")), [points]);
  const days = useMemo(() => dayOrder.filter((day) => points.some((point) => point.dayKey === day.key)), [points]);
  const max = useMemo(() => Math.max(...points.map((point) => point.opm), 0), [points]);
  const map = useMemo(() => new Map(points.map((point) => [`${point.dayKey}|${point.time}`, point])), [points]);
  const selectedDays = useMemo(() => {
    const selected = selectedDayKeys.map((key) => days.find((day) => day.key === key)).filter(Boolean) as DayOption[];
    return selected.length ? selected.slice(0, 2) : days.slice(0, Math.min(2, days.length));
  }, [days, selectedDayKeys]);
  const lineRows = useMemo(() => times.map((time) => Object.fromEntries([["time", time], ...selectedDays.map((day) => [day.key, map.get(`${day.key}|${time}`)?.opm ?? null])]) as Record<string, Scalar>), [map, selectedDays, times]);
  const activeMobileDay = days.find((day) => day.key === mobileDayKey) || days[0];
  const mobilePoints = useMemo(() => activeMobileDay ? times.map((time) => ({ time, point: map.get(`${activeMobileDay.key}|${time}`) })) : [], [activeMobileDay, map, times]);
  const toggleDay = useCallback((key: string) => setSelectedDayKeys((current) => {
    if (current.includes(key)) return current.length > 1 ? current.filter((item) => item !== key) : current;
    return [...current, key].slice(-2);
  }), []);
  if (!points.length || !times.length || !days.length) return <Empty title="Maravilha FM Dia a Dia" text="Não foi possível identificar dia, horário e OPM." />;
  return <div className="space-y-4">
    <Panel title="Maravilha FM Dia a Dia" subtitle="Heatmap de audiência por dia e horário.">
      <div className="daily-heatmap-shell" onMouseLeave={() => setHover(null)}>
        {hover && <div className="daily-tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}><strong>{hover.day}</strong><span>Horário: {hover.time}</span><span>OPM: {format(hover.opm)}</span></div>}
        <div className="heatmap-wrap daily-heatmap-desktop"><div className="heatmap-lite" style={{ gridTemplateColumns: `110px repeat(${times.length}, minmax(48px, 1fr))` }}><div className="heatmap-head">Dia</div>{times.map((time) => <div key={String(time)} className="heatmap-head">{time}</div>)}{days.map((day) => <div className="contents" key={day.key}><div className="heatmap-label">{day.label}</div>{times.map((time) => { const point = map.get(`${day.key}|${time}`); return <div key={`${day.key}-${time}`} className="heatmap-cell" style={{ background: point ? heatColor(point.opm, max) : "#f1f5f9", color: point && point.opm / (max || 1) > .45 ? "#fff" : "#334155" }} onMouseMove={(event) => point && setHover({ day: day.label, time: String(time), opm: point.opm, x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}>{point ? format(point.opm) : "—"}</div>; })}</div>)}</div></div>
        <div className="daily-mobile-panel"><label className="field-label">Dia<select className="input" value={activeMobileDay?.key || ""} onChange={(event) => setMobileDayKey(event.target.value)}>{days.map((day) => <option key={day.key} value={day.key}>{day.label}</option>)}</select></label><div className="daily-mobile-list">{mobilePoints.map(({ time, point }) => <div key={String(time)}><span>{time}</span><strong>{point ? format(point.opm) : "—"}</strong><i style={{ width: `${Math.max(4, ((point?.opm ?? 0) / (max || 1)) * 100)}%`, background: point ? heatColor(point.opm, max) : "#e2e8f0" }}/></div>)}</div></div>
      </div>
    </Panel>
    <Panel title="Filtro do comparativo"><div className="daily-day-filter">{days.map((day) => <button key={day.key} className={`filter-chip ${selectedDays.some((item) => item.key === day.key) ? "filter-chip-active" : ""}`} onClick={() => toggleDay(day.key)}>{day.label}</button>)}</div><p className="daily-helper">Selecione até 2 dias. O gráfico nunca renderiza os 7 dias juntos.</p></Panel>
    <DayComparisonLine rows={lineRows} days={selectedDays}/>
  </div>;
}

function SimpleLine({ rows, series, colors, averageLabel }: { rows: Record<string, number | string | null>[]; series: string[]; colors?: Record<string, string>; averageLabel?: string }) {
  const width = 980; const height = 320; const left = 44; const right = 20; const top = 18; const bottom = 46;
  const values = rows.flatMap((row) => series.map((key) => typeof row[key] === "number" ? row[key] as number : null)).filter((value): value is number => value !== null);
  const max = Math.max(...values, 1); const min = Math.min(...values, 0); const span = max - min || 1;
  const x = (index: number) => left + (index / Math.max(rows.length - 1, 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - min) / span) * (height - top - bottom);
  const avg = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  return <div className="svg-scroll"><svg viewBox={`0 0 ${width} ${height}`} className="line-svg"><rect width={width} height={height} fill="#fff"/><line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#e2e8f0"/><line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#e2e8f0"/>{averageLabel && <><line x1={left} x2={width - right} y1={y(avg)} y2={y(avg)} stroke={GOLD} strokeDasharray="6 4"/><text x={left + 8} y={y(avg) - 6} fill={GOLD} fontSize="11" fontWeight="800">{averageLabel}: {format(avg)}</text></>}{series.map((key, seriesIndex) => { const points = rows.map((row, index) => ({ x: x(index), y: y(typeof row[key] === "number" ? row[key] as number : min), value: row[key] })).filter((point) => typeof point.value === "number"); const d = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" "); return <g key={key}><path d={d} fill="none" stroke={colors?.[key] || COLORS[seriesIndex % COLORS.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="4" fill={colors?.[key] || COLORS[seriesIndex % COLORS.length]}><title>{`${key}\n${rows[index]?.label ?? rows[index]?.time ?? ""}\nOPM: ${format(point.value as number)}`}</title></circle>)}</g>; })}{rows.map((row, index) => index % Math.ceil(rows.length / 12 || 1) === 0 ? <text key={index} x={x(index)} y={height - 18} fill="#64748b" fontSize="10" textAnchor="middle">{String(row.label ?? row.time ?? "")}</text> : null)}</svg></div>;
}

function SomatorioView({ data }: { data: AnalysisResponse }) {
  const [mode, setMode] = useState<"line" | "bar">("line");
  const { dimensions, metricColumn } = audienceColumns(data);
  const xColumn = findColumn(dimensions, ["dia", "data", "horario", "hora", "periodo"]) || dimensions[0] || data.analysis.schema_json.columns[0];
  const rows = useMemo(() => data.rows.map((row) => ({ label: String(row[xColumn?.key || ""] ?? ""), valor: numberValue(row[metricColumn?.key || data.analysis.schema_json.yKeys[0] || ""] ?? null) })).filter((row) => row.label || row.valor).sort((a, b) => timeRank(a.label) - timeRank(b.label)), [data, metricColumn?.key, xColumn?.key]);
  const rank = rows.map((row) => ({ name: row.label, opm: row.valor, position: 0, color: row.valor === Math.max(...rows.map((item) => item.valor)) ? MARAVILHA : NEUTRAL }));
  return <Panel title="Maravilha FM - Somatório" subtitle="Linha com média semanal e alternância para barras."><div className="mb-3 flex gap-2"><button className={`filter-chip ${mode === "line" ? "filter-chip-active" : ""}`} onClick={() => setMode("line")}>Linha</button><button className={`filter-chip ${mode === "bar" ? "filter-chip-active" : ""}`} onClick={() => setMode("bar")}>Barras Verticais</button></div>{mode === "line" ? <SimpleLine rows={rows.map((row) => ({ label: row.label, valor: row.valor }))} series={["valor"]} colors={{ valor: MARAVILHA }} averageLabel="Média Semanal"/> : <VerticalBars rows={rank} />}</Panel>;
}

function VerticalBars({ rows }: { rows: RankRow[] }) {
  const max = Math.max(...rows.map((row) => row.opm), 1);
  return <div className="vertical-bars">{rows.slice(0, 48).map((row) => <div key={row.name} className="vertical-bar" title={`${row.name}\nOPM: ${format(row.opm)}`}><i style={{ height: `${Math.max(4, (row.opm / max) * 100)}%`, background: row.color }}/><span>{row.name}</span><strong>{format(row.opm)}</strong></div>)}</div>;
}

function pivotPoints(points: AudiencePoint[], selectedStations: string[]) {
  const times = unique(points.map((point) => point.time)).sort((a, b) => timeRank(String(a)) - timeRank(String(b)) || String(a).localeCompare(String(b), "pt-BR"));
  return times.map((time) => Object.fromEntries([["time", time], ...selectedStations.map((station) => [station, points.find((point) => point.time === time && point.station === station)?.opm ?? null])]) as Record<string, string | number | null>);
}

function MultiStationLine({ data, title, maxStations = 3 }: { data: AnalysisResponse; title: string; maxStations?: number }) {
  const points = useMemo(() => audiencePoints(data), [data]);
  const days = useMemo(() => dayOrder.filter((day) => points.some((point) => point.dayKey === day.key)), [points]);
  const [day, setDay] = useState(days[0]?.key || "geral");
  const dayPoints = points.filter((point) => point.dayKey === day || (!days.length && day === "geral"));
  const stationOptions = unique(dayPoints.map((point) => point.station)).slice(0, 80);
  const [selected, setSelected] = useState<string[]>(stationOptions.slice(0, Math.min(maxStations, 3)));
  const selectedStations = selected.filter((station) => stationOptions.includes(station)).slice(0, maxStations);
  const chartRows = useMemo(() => pivotPoints(dayPoints, selectedStations), [dayPoints, selectedStations]);
  const colors = Object.fromEntries(selectedStations.map((station, index) => [station, stationColor(station, index)]));
  const toggle = useCallback((station: string) => setSelected((current) => current.includes(station) ? current.filter((item) => item !== station) : [...current, station].slice(-maxStations)), [maxStations]);
  return <div className="space-y-4"><Panel title={title} subtitle="Selecione dia e emissoras. Não renderiza todas simultaneamente."><div className="grid gap-3 md:grid-cols-[220px_1fr]"><label className="field-label">Dia<select className="input" value={day} onChange={(event) => { setDay(event.target.value); setSelected([]); }}>{days.length ? days.map((item) => <option key={item.key} value={item.key}>{item.label}</option>) : <option value="geral">Geral</option>}</select></label><div><p className="field-label mb-2">Emissoras, máx. {maxStations}</p><div className="chip-list">{stationOptions.map((station) => <button key={station} className={`filter-chip ${selectedStations.includes(station) ? "filter-chip-active" : ""}`} onClick={() => toggle(station)}>{station}</button>)}</div></div></div></Panel><Panel title="Gráfico principal"><SimpleLine rows={chartRows} series={selectedStations} colors={colors}/></Panel><FilteredTable rows={dayPoints.filter((point) => !selectedStations.length || selectedStations.includes(point.station)).map((point) => ({ Horário: point.time, Emissora: point.station, OPM: point.opm }))}/></div>;
}

function CompetitiveView({ data }: { data: AnalysisResponse }) {
  const target = ["Maravilha FM", "93 FM", "Melodia FM"];
  const points = audiencePoints(data).filter((point) => target.some((name) => lower(point.station).includes(lower(name).replace(" fm", ""))));
  const rows = pivotPoints(points, unique(points.map((point) => point.station)).slice(0, 3));
  const stations = unique(points.map((point) => point.station)).slice(0, 3);
  return <Panel title="Análise Competitiva" subtitle="Barras agrupadas para Maravilha, 93 FM e Melodia."><GroupedBars rows={rows} series={stations}/></Panel>;
}

function GroupedBars({ rows, series }: { rows: Record<string, Scalar>[]; series: string[] }) {
  const max = Math.max(...rows.flatMap((row) => series.map((key) => numberValue(row[key] ?? null))), 1);
  return <div className="grouped-bars">{rows.slice(0, 36).map((row) => <div key={String(row.time)} className="group"><div className="group-bars">{series.map((key, index) => <i key={key} style={{ height: `${Math.max(4, (numberValue(row[key] ?? null) / max) * 100)}%`, background: stationColor(key, index) }} title={`${String(row.time)}\n${key}: ${format(row[key] ?? null)}`}/>)}</div><span>{String(row.time)}</span></div>)}</div>;
}

function FilteredTable({ rows }: { rows: Record<string, Scalar>[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: Object.keys(rows[0] ?? {})[0] || "", direction: "asc" });
  const [page, setPage] = useState(1);
  const columns = Object.keys(rows[0] ?? {});
  const filtered = useMemo(() => { const term = lower(search); const base = rows.filter((row) => !term || lower(Object.values(row).join(" ")).includes(term)); const direction = sort.direction === "asc" ? 1 : -1; return [...base].sort((a, b) => String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), "pt-BR", { numeric: true }) * direction); }, [rows, search, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const changeSort = (key: string) => setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  if (!columns.length) return null;
  return <Panel title="Dados da análise" subtitle={`${filtered.length} registros filtrados. Tabela paginada para performance.`}><div className="mb-3"><input className="input max-w-md" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Pesquisar"/></div><div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}><button onClick={() => changeSort(column)}>{column}</button></th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{format(row[column] ?? null)}</td>)}</tr>)}</tbody></table></div><div className="mt-3 flex items-center justify-between gap-3"><button className="button-secondary" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span className="text-xs font-bold text-slate-500">Página {currentPage} de {totalPages}</span><button className="button-secondary" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button></div></Panel>;
}

function Empty({ title, text }: { title: string; text: string }) { return <Panel title={title}><div className="grid min-h-56 place-items-center text-center text-sm font-bold text-slate-400">{text}</div></Panel>; }

function GenericView({ data }: { data: AnalysisResponse }) {
  const metric = data.analysis.schema_json.yKeys[0];
  const xKey = data.analysis.schema_json.xKey || data.analysis.schema_json.columns[0]?.key || "";
  const rows = data.rows.slice(0, 60).map((row, index) => ({ name: String(row[xKey] ?? `Item ${index + 1}`), opm: numberValue(row[metric] ?? null), position: index + 1, color: COLORS[index % COLORS.length] || NEUTRAL }));
  return <>{metric ? <HorizontalBars rows={rows.sort((a, b) => b.opm - a.opm)} title={data.analysis.nome}/> : null}<FilteredTable rows={data.rows}/></>;
}

export function DynamicAnalysis({ slug, importId }: { slug: string; importId: number }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useQuery<AnalysisResponse>({ queryKey: ["analysis-data", slug, importId, filters], queryFn: async () => (await api.get(`/analyses/${slug}/data`, { params: { import_id: importId, ...filters } })).data });
  const data = query.data;
  const columns = useMemo(() => data?.analysis.schema_json.columns ?? [], [data]);
  if (query.isLoading) return isRanking(slug) ? <RankingSkeleton/> : isDailyMaravilha(slug) ? <DailySkeleton/> : <Loading/>;
  if (query.isError || !data) return <ErrorState message={errorMessage(query.error)}/>;
  const metrics = data.analysis.schema_json.yKeys;
  const changeFilter = (key: string, value: string) => setFilters((current) => { const next = { ...current }; if (value) next[key] = value; else delete next[key]; return next; });
  const view = isRanking(data) ? <RankingGeneralChart data={data}/> : isDailyMaravilha(data) ? <DailyHeatmap data={data}/> : isSomatorio(data) ? <SomatorioView data={data}/> : isAllStationsDaily(data) ? <MultiStationLine data={data} title="Todas Emissoras - Dia a Dia" maxStations={4}/> : isTimeRange(data) ? <MultiStationLine data={data} title="Análise por Faixa Horária Concorrentes" maxStations={2}/> : isCompetitive(data) ? <CompetitiveView data={data}/> : data.analysis.tipo_visualizacao === "kpi" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((key) => { const column = columns.find((item) => item.key === key); return <Kpi key={key} label={column?.label || key} value={format(data.summary[key]?.sum ?? null)} detail={`Média: ${format(data.summary[key]?.average ?? null)}`}/>; })}</div> : <GenericView data={data}/>;
  const showGenericFilters = Boolean(data.analysis.schema_json.filters.length) && !isAllStationsDaily(data) && !isTimeRange(data);
  return <div className="space-y-5">{showGenericFilters && <Panel title="Filtros"><div className="flex flex-wrap gap-3">{data.analysis.schema_json.filters.map((key) => { const column = columns.find((item) => item.key === key); return <label className="select-wrap" key={key}><span>{column?.label || key}</span><select value={filters[key] || ""} onChange={(event) => changeFilter(key, event.target.value)}><option value="">Todos</option>{data.options[key]?.map((value) => <option key={value}>{value}</option>)}</select></label>; })}</div></Panel>}{view}</div>;
}
