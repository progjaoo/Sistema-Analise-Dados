import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, PolarAngleAxis,
  PolarGrid, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import { api, errorMessage } from "../api/client.js";
import { AudienceTooltip, chartMargin } from "../components/ChartBits.jsx";
import { ErrorState, Kpi, Loading, Panel } from "../components/ui.jsx";
import { DAYS, DAY_LABELS, STATION_COLORS, downloadCsv, formatOpm, pivot, shortStation } from "../lib/format.js";

const useDashboard = (key, url, uploadId) => useQuery({
  queryKey: ["dashboard", key, uploadId],
  queryFn: async () => (await api.get(`${url}?upload_id=${uploadId}`)).data,
  enabled: Boolean(uploadId),
});

const axisTick = { fontSize: 10, fill: "#64748b" };
const grid = <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />;

export function RankingGeral({ uploadId }) {
  const query = useDashboard("ranking", "/dashboard/ranking", uploadId);
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} />;
  const { data, summary } = query.data;
  const chartData = data.map((row) => ({ ...row, nome: shortStation(row.emissora) }));
  const top = data[0];
  const gap = summary.maravilha && top ? ((top.audiencia_opm - summary.maravilha.audiencia_opm) / top.audiencia_opm) * 100 : null;

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <Kpi label="Posição Maravilha" value={`${summary.maravilha?.posicao || "—"}º`} detail={`${formatOpm(summary.maravilha?.audiencia_opm, 1)} OPM`} />
      <Kpi label="Líder do período" value={shortStation(top?.emissora || "—")} detail={`${formatOpm(top?.audiencia_opm, 1)} OPM`} accent="signal" />
      <Kpi label="Distância para o líder" value={gap === null ? "—" : `${gap.toFixed(1)}%`} detail={`${summary.total_emissoras} emissoras medidas`} accent="violet" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
      <Panel title="Ranking geral por audiência" subtitle="OPM acumulado no período">
        <div className="h-[610px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 610 }}><BarChart data={chartData} layout="vertical" margin={{ ...chartMargin, left: 28 }}>
          {grid}<XAxis type="number" tick={axisTick} tickFormatter={(v) => formatOpm(v)} /><YAxis type="category" dataKey="nome" width={155} tick={axisTick} /><Tooltip content={<AudienceTooltip />} /><Bar dataKey="audiencia_opm" name="Audiência" radius={[0, 6, 6, 0]}>{chartData.map((row) => <Cell key={row.emissora} fill={/MARAVILHA/i.test(row.emissora) ? "#FF8000" : "#334155"} />)}</Bar>
        </BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Tabela de posições" subtitle="Maravilha destacada em laranja">
        <div className="max-h-[610px] overflow-auto"><table className="data-table"><thead><tr><th>#</th><th>Emissora</th><th className="text-right">OPM</th></tr></thead><tbody>{data.map((row) => <tr key={row.emissora} className={/MARAVILHA/i.test(row.emissora) ? "highlight-row" : ""}><td>{row.posicao}</td><td>{shortStation(row.emissora)}</td><td className="text-right font-semibold">{formatOpm(row.audiencia_opm, 1)}</td></tr>)}</tbody></table></div>
      </Panel>
    </div>
  </div>;
}

export function MaravilhaDiaDia({ uploadId }) {
  const query = useDashboard("maravilha-dia", "/dashboard/maravilha/dia-a-dia", uploadId);
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} />;
  const rows = query.data.data;
  const data = pivot(rows, "bloco_horario", "dia_semana", "audiencia_opm");
  const hourly = data.filter((row) => row.bloco_horario !== "05-05 BL.1H");
  const values = rows.map((row) => row.audiencia_opm).filter(Boolean);
  const max = Math.max(...values);
  const dayAverage = DAYS.map((day) => ({ day, value: rows.filter((row) => row.dia_semana === day && row.audiencia_opm !== null).reduce((sum, row, _, arr) => sum + row.audiencia_opm / arr.length, 0) }));
  const bestDay = dayAverage.reduce((best, row) => row.value > best.value ? row : best, dayAverage[0]);

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3"><Kpi label="Pico semanal" value={formatOpm(query.data.summary.pico?.audiencia_opm, 1)} detail={`${DAY_LABELS[query.data.summary.pico?.dia_semana]} • ${query.data.summary.pico?.bloco_horario}`} /><Kpi label="Melhor dia médio" value={DAY_LABELS[bestDay.day]} detail={`${formatOpm(bestDay.value, 1)} OPM médio`} accent="signal" /><Kpi label="Blocos monitorados" value={hourly.length} detail="24 horas por dia" accent="violet" /></div>
    <Panel title="Mapa de intensidade semanal" subtitle="Células mais escuras indicam maior audiência; traços representam ausência de medição.">
      <div className="overflow-x-auto"><div className="heatmap" style={{ gridTemplateColumns: `120px repeat(${DAYS.length}, minmax(66px, 1fr))` }}><div />{DAYS.map((day) => <div className="heatmap-head" key={day}>{DAY_LABELS[day]}</div>)}{hourly.flatMap((row) => [<div className="heatmap-label" key={`${row.bloco_horario}-label`}>{row.bloco_horario.slice(0, 5)}</div>, ...DAYS.map((day) => { const value = row[day]; const strength = value ? Math.max(.1, value / max) : 0; return <div title={`${DAY_LABELS[day]} ${row.bloco_horario}: ${formatOpm(value, 1)} OPM`} className="heatmap-cell" key={`${row.bloco_horario}-${day}`} style={{ backgroundColor: value ? `rgba(255,128,0,${.12 + strength * .88})` : "#f1f5f9", color: strength > .52 ? "white" : "#475569" }}>{value ? formatOpm(value) : "—"}</div>; })])}</div></div>
    </Panel>
    <Panel title="Curva de audiência por hora" subtitle="Comparação dos sete dias da semana">
      <div className="h-[410px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 410 }}><LineChart data={hourly} margin={chartMargin}>{grid}<XAxis dataKey="bloco_horario" tick={axisTick} interval={2} tickFormatter={(v) => v.slice(0, 5)} /><YAxis tick={axisTick} tickFormatter={formatOpm} /><Tooltip content={<AudienceTooltip />} /><Legend formatter={(value) => DAY_LABELS[value]} />{DAYS.map((day, index) => <Line key={day} dataKey={day} type="monotone" connectNulls stroke={["#FF8000", "#2563EB", "#7C3AED", "#F59E0B", "#10B981", "#334155", "#DC2626"][index]} dot={false} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div>
    </Panel>
  </div>;
}

export function MaravilhaSomatorio({ uploadId }) {
  const query = useDashboard("maravilha-soma", "/dashboard/maravilha/somatorio", uploadId);
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} />;
  const data = query.data.data.filter((row) => row.bloco_horario !== "05-05 BL.1H");
  const { summary } = query.data;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3"><Kpi label="Melhor bloco" value={summary.melhor?.bloco_horario} detail={`${formatOpm(summary.melhor?.audiencia_total, 1)} OPM`} /><Kpi label="Média horária" value={formatOpm(summary.media, 1)} detail="Média dos blocos válidos" accent="signal" /><Kpi label="Menor bloco" value={summary.pior?.bloco_horario} detail={`${formatOpm(summary.pior?.audiencia_total, 1)} OPM`} accent="violet" /></div>
    <Panel title="Somatório por bloco horário" subtitle="A linha pontilhada representa a média horária.">
      <div className="h-[480px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 480 }}><BarChart data={data} margin={chartMargin}>{grid}<XAxis dataKey="bloco_horario" tick={axisTick} interval={1} angle={-35} textAnchor="end" height={72} tickFormatter={(v) => v.slice(0, 5)} /><YAxis tick={axisTick} tickFormatter={formatOpm} /><Tooltip content={<AudienceTooltip />} /><ReferenceLine y={summary.media} stroke="#A84700" strokeDasharray="5 5" label={{ value: "Média", fill: "#A84700", fontSize: 11 }} /><Bar dataKey="audiencia_total" name="Maravilha FM" fill="#FF8000" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </Panel>
  </div>;
}

export function TodasEmissoras({ uploadId }) {
  const query = useDashboard("emissoras", "/dashboard/emissoras/dia-a-dia", uploadId);
  const [selected, setSelected] = useState(["GRJ - MARAVILHA FM/WEB", "GRJ - 93 FM/WEB", "GRJ - MELODIA FM/WEB", "GRJ - JB FM 99.9 FM/WEB"]);
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} />;
  const rows = query.data.data;
  const stations = [...new Set(rows.map((row) => row.emissora))];
  const chartData = DAYS.map((day) => ({ day, ...Object.fromEntries(rows.filter((row) => row.dia_semana === day).map((row) => [row.emissora, row.audiencia_opm])) }));
  const tableData = pivot(rows, "emissora", "dia_semana", "audiencia_opm");
  const toggle = (station) => setSelected((current) => current.includes(station) ? current.filter((item) => item !== station) : current.length < 7 ? [...current, station] : current);
  return <div className="space-y-5">
    <Panel title="Emissoras exibidas" subtitle="Selecione até sete linhas para manter o gráfico legível."><div className="flex flex-wrap gap-2">{stations.map((station) => <button key={station} className={`filter-chip ${selected.includes(station) ? "filter-chip-active" : ""}`} onClick={() => toggle(station)}>{shortStation(station)}</button>)}</div></Panel>
    <Panel title="Audiência por dia da semana" subtitle="A linha da Maravilha permanece em laranja."><div className="h-[430px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 430 }}><LineChart data={chartData} margin={chartMargin}>{grid}<XAxis dataKey="day" tickFormatter={(day) => DAY_LABELS[day]} tick={axisTick} /><YAxis tick={axisTick} tickFormatter={formatOpm} /><Tooltip content={<AudienceTooltip />} /><Legend formatter={shortStation} />{selected.map((station, index) => <Line key={station} dataKey={station} type="monotone" stroke={STATION_COLORS[station] || ["#334155", "#f59e0b", "#10b981", "#3b82f6"][index % 4]} strokeWidth={/MARAVILHA/.test(station) ? 4 : 2} dot={{ r: 3 }} />)}</LineChart></ResponsiveContainer></div></Panel>
    <Panel title="Tabela comparativa"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Emissora</th>{DAYS.map((day) => <th className="text-right" key={day}>{DAY_LABELS[day]}</th>)}</tr></thead><tbody>{tableData.map((row) => <tr key={row.emissora} className={/MARAVILHA/.test(row.emissora) ? "highlight-row" : ""}><td>{shortStation(row.emissora)}</td>{DAYS.map((day) => <td className="text-right" key={day}>{formatOpm(row[day])}</td>)}</tr>)}</tbody></table></div></Panel>
  </div>;
}

export function AnaliseCompetitiva({ uploadId }) {
  const query = useDashboard("competitiva", "/dashboard/competitiva", uploadId);
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} />;
  const stations = [...new Set(query.data.data.map((row) => row.emissora))];
  const data = pivot(query.data.data, "bloco_horario", "emissora", "audiencia_opm").filter((row) => row.bloco_horario !== "05-05 BL.1H");
  const radarData = data.filter((_, index) => index >= 2 && index <= 18 && index % 2 === 0).map((row) => ({ ...row, bloco: row.bloco_horario.slice(0, 5) }));
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3"><Kpi label="Pico Maravilha" value={query.data.summary.melhor_bloco_maravilha?.bloco_horario} detail={`${formatOpm(query.data.summary.melhor_bloco_maravilha?.audiencia_opm, 1)} OPM`} /><Kpi label="Concorrentes diretas" value="3 emissoras" detail="93 FM • Melodia • Maravilha" accent="signal" /><Kpi label="Faixas comparadas" value={data.length} detail="Somatório semanal" accent="violet" /></div>
    <Panel title="Comparativo por bloco horário" subtitle="Escala única em OPM para comparação direta."><div className="h-[490px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 490 }}><BarChart data={data} margin={chartMargin}>{grid}<XAxis dataKey="bloco_horario" tick={axisTick} interval={2} angle={-35} height={72} textAnchor="end" tickFormatter={(v) => v.slice(0, 5)} /><YAxis tick={axisTick} tickFormatter={formatOpm} /><Tooltip content={<AudienceTooltip />} /><Legend formatter={shortStation} />{stations.map((station) => <Bar key={station} dataKey={station} fill={STATION_COLORS[station]} radius={[3, 3, 0, 0]} />)}</BarChart></ResponsiveContainer></div></Panel>
    <Panel title="Perfil relativo em horários-chave" subtitle="A forma evidencia em quais faixas cada emissora concentra sua audiência."><div className="h-[430px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 430 }}><RadarChart data={radarData}><PolarGrid stroke="#cbd5e1" /><PolarAngleAxis dataKey="bloco" tick={axisTick} /><Tooltip content={<AudienceTooltip />} /><Legend formatter={shortStation} />{stations.map((station) => <Radar key={station} dataKey={station} stroke={STATION_COLORS[station]} fill={STATION_COLORS[station]} fillOpacity={/MARAVILHA/.test(station) ? .28 : .08} />)}</RadarChart></ResponsiveContainer></div></Panel>
  </div>;
}

export function FaixaHoraria({ uploadId }) {
  const query = useDashboard("faixa", "/dashboard/faixa-horaria", uploadId);
  const [day, setDay] = useState("SEGUNDA");
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} />;
  const rows = query.data.data;
  const stations = [...new Set(rows.map((row) => row.emissora))];
  const dayRows = rows.filter((row) => row.dia_semana === day);
  const data = pivot(dayRows, "parte_do_dia", "emissora", "audiencia_opm").filter((row) => row.parte_do_dia !== "05-05 BL.1H");
  return <div className="space-y-5">
    <Panel title="Filtro e exportação"><div className="flex flex-wrap items-end justify-between gap-3"><label className="select-wrap"><span>Dia da semana</span><select value={day} onChange={(event) => setDay(event.target.value)}>{DAYS.map((item) => <option value={item} key={item}>{DAY_LABELS[item]}</option>)}</select></label><button className="button-secondary" onClick={() => downloadCsv(`faixa-horaria-${day.toLowerCase()}.csv`, dayRows)}><Download size={16} />Exportar CSV</button></div></Panel>
    <Panel title={`Audiência detalhada • ${DAY_LABELS[day]}`} subtitle="Comparativo das três emissoras em cada hora."><div className="h-[490px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 490 }}><BarChart data={data} margin={chartMargin}>{grid}<XAxis dataKey="parte_do_dia" tick={axisTick} interval={2} angle={-35} height={72} textAnchor="end" tickFormatter={(v) => v.slice(0, 5)} /><YAxis tick={axisTick} tickFormatter={formatOpm} /><Tooltip content={<AudienceTooltip />} /><Legend formatter={shortStation} />{stations.map((station) => <Bar key={station} dataKey={station} fill={STATION_COLORS[station]} radius={[3, 3, 0, 0]} />)}</BarChart></ResponsiveContainer></div></Panel>
    <Panel title="Tabela dinâmica"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Horário</th>{stations.map((station) => <th className="text-right" key={station}>{shortStation(station)}</th>)}</tr></thead><tbody>{data.map((row) => <tr key={row.parte_do_dia}><td>{row.parte_do_dia}</td>{stations.map((station) => <td className={`text-right ${/MARAVILHA/.test(station) ? "font-bold text-radio" : ""}`} key={station}>{formatOpm(row[station], 1)}</td>)}</tr>)}</tbody></table></div></Panel>
  </div>;
}
