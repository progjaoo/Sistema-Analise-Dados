import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { DynamicAnalysis } from "../components/DynamicAnalysis.js";
import { EmptyState, PageHeader } from "../components/ui.js";
import type { AnalysisType, ImportRecord } from "../types.js";

export function DashboardPage() {
  const [importId, setImportId] = useState(0); const [slug, setSlug] = useState("");
  const imports = useQuery<ImportRecord[]>({ queryKey: ["imports"], queryFn: async () => (await api.get("/imports")).data.imports });
  const selectedImport = importId || imports.data?.[0]?.id || 0;
  const analyses = useQuery<AnalysisType[]>({ queryKey: ["analyses", selectedImport], enabled: Boolean(selectedImport), queryFn: async () => (await api.get("/analyses", { params: { import_id: selectedImport } })).data.analyses });
  useEffect(() => { if (analyses.data?.length && !analyses.data.some((item) => item.slug === slug)) setSlug(analyses.data[0]!.slug); }, [analyses.data, slug]);
  const active = analyses.data?.find((analysis) => analysis.slug === slug);
  return <div className="mx-auto max-w-[1500px]"><PageHeader eyebrow="IBOPE / Dashboard dinâmico" title={active?.nome || "Painel de audiência"} description={active?.descricao || "As análises e visualizações são definidas automaticamente pelo arquivo Excel."} actions={<label className="select-wrap"><span>Período</span><select value={selectedImport} onChange={(event) => { setImportId(Number(event.target.value)); setSlug(""); }}>{imports.data?.map((item) => <option key={item.id} value={item.id}>{item.periodo}</option>)}</select></label>}/>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-2">{analyses.data?.map((analysis) => <button key={analysis.slug} className={`tab-button ${analysis.slug === slug ? "tab-button-active" : ""}`} onClick={() => setSlug(analysis.slug)}>{analysis.nome}</button>)}</div>
    {!imports.isLoading && !selectedImport ? <EmptyState/> : active && selectedImport ? <DynamicAnalysis slug={active.slug} importId={selectedImport}/> : null}
  </div>;
}
