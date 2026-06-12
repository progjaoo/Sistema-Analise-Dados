import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSpreadsheet, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { api, errorMessage } from "../api/client.js";
import { PageHeader, Panel } from "../components/ui.jsx";

export function UploadsPage() {
  const client = useQueryClient();
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState("Abril 2026");
  const [feedback, setFeedback] = useState(null);
  const uploads = useQuery({ queryKey: ["uploads"], queryFn: async () => (await api.get("/uploads")).data.uploads });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("arquivo", file);
      body.append("periodo", period);
      return (await api.post("/uploads", body)).data;
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", text: `Relatório processado: ${data.counts.ranking} posições e ${data.counts.faixaHoraria} registros detalhados.` });
      setFile(null);
      client.invalidateQueries({ queryKey: ["uploads"] });
    },
    onError: (error) => setFeedback({ type: "error", text: errorMessage(error) }),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/uploads/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["uploads"] }),
  });

  const submit = (event) => {
    event.preventDefault();
    setFeedback(null);
    if (!file) return setFeedback({ type: "error", text: "Selecione um arquivo .xlsx." });
    uploadMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Base histórica" title="Relatórios Ibope" description="Importe cada período uma única vez. O parser valida as seis abas e preserva os relatórios anteriores para comparação." />
      <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <Panel title="Novo upload" subtitle="Formato aceito: .xlsx • limite de 20 MB">
          <form onSubmit={submit}>
            <label className="upload-zone">
              <input className="sr-only" type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              <UploadCloud className="text-radio" size={32} />
              <strong className="mt-3 text-sm text-ink">{file ? file.name : "Clique para selecionar o relatório"}</strong>
              <span className="mt-1 text-xs text-slate-400">As planilhas são processadas em memória.</span>
            </label>
            <label className="field-label mt-5">Período de referência<input className="input" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Abril 2026" required /></label>
            {feedback && <div className={`mt-4 rounded-xl p-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{feedback.text}</div>}
            <button className="button-primary mt-5 w-full" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? "Processando..." : "Importar relatório"}</button>
          </form>
        </Panel>

        <Panel title="Períodos disponíveis" subtitle="A exclusão remove também os dados vinculados.">
          <div className="space-y-3">
            {uploads.isLoading && <p className="py-8 text-center text-sm text-slate-400">Carregando...</p>}
            {uploads.data?.map((upload) => (
              <div key={upload.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FileSpreadsheet size={21} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><strong className="text-sm text-ink">{upload.periodo}</strong><span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600"><CheckCircle2 size={12} />{upload.status}</span></div>
                  <p className="truncate text-xs text-slate-400">{upload.nome_arquivo}</p>
                </div>
                <button className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Excluir" onClick={() => removeMutation.mutate(upload.id)}><Trash2 size={17} /></button>
              </div>
            ))}
            {!uploads.isLoading && !uploads.data?.length && <p className="py-10 text-center text-sm text-slate-400">Nenhum período importado.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
