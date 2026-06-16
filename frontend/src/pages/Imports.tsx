import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Trash2, UploadCloud } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import { PageHeader, Panel } from "../components/ui.js";
import type { ImportRecord } from "../types.js";

const filenameFromDisposition = (value: string | undefined, fallback: string) => {
  const utf8 = value?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) return decodeURIComponent(utf8);
  return value?.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
};

export function ImportsPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState("");
  const [feedback, setFeedback] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const imports = useQuery<ImportRecord[]>({ queryKey: ["imports"], queryFn: async () => (await api.get("/imports")).data.imports });
  const upload = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("arquivo", file!);
      body.append("periodo", period);
      return (await api.post("/imports", body)).data;
    },
    onSuccess: (data) => {
      setFeedback(`${data.analyses.length} análises detectadas e importadas.`);
      setFile(null);
      client.invalidateQueries({ queryKey: ["imports"] });
    },
    onError: (error) => setFeedback(errorMessage(error)),
  });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/imports/${id}`), onSuccess: () => client.invalidateQueries({ queryKey: ["imports"] }) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!file) return setFeedback("Selecione um arquivo .xlsx."); upload.mutate(); };

  const downloadImport = async (item: ImportRecord) => {
    setDownloadingId(item.id);
    setFeedback("");
    try {
      const response = await api.get(`/imports/${item.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(response.headers["content-disposition"], item.arquivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  return <div className="mx-auto max-w-6xl"><PageHeader eyebrow="Base histórica" title="Importações IBOPE" description="Todas as abas tabulares são detectadas. Novas análises aparecem automaticamente no dashboard."/><div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
    <Panel title="Novo upload" subtitle="Formato .xlsx • metadados e filtros gerados automaticamente"><form onSubmit={submit}><label className="upload-zone"><input className="sr-only" type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)}/><UploadCloud className="text-radio" size={32}/><strong className="mt-3 text-sm text-ink">{file?.name || "Selecionar relatório"}</strong></label><label className="field-label mt-5">Período<input className="input" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ex.: Maio 2026" required/></label>{feedback && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-brand-deeper">{feedback}</p>}<button className="button-primary mt-5 w-full" disabled={upload.isPending || user?.role === "VIEWER"}>{upload.isPending ? "Processando..." : "Importar Excel"}</button></form></Panel>
    <Panel title="Histórico" subtitle="Quantidade de análises e registros por arquivo"><div className="space-y-3">{imports.data?.map((item) => { const failed = item.status === "FAILED"; const hasFile = Boolean(item.arquivo_disponivel || item.arquivo_tamanho); return <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><div className={`grid h-11 w-11 place-items-center rounded-xl ${failed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}><FileSpreadsheet size={21}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="text-sm text-ink">{item.periodo}</strong><span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${failed ? "text-red-600" : "text-emerald-600"}`}><CheckCircle2 size={12}/>{item.status}</span></div><p className="truncate text-xs text-slate-400">{item.arquivo} • {failed ? item.erro : `${item.total_analises} análises • ${item.total_registros} registros`}</p></div><button className="rounded-xl p-2 text-slate-400 hover:bg-orange-50 hover:text-radio disabled:cursor-not-allowed disabled:opacity-40" title={hasFile ? "Baixar planilha importada" : "Arquivo original indisponível para importações antigas"} disabled={!hasFile || downloadingId === item.id} onClick={() => downloadImport(item)}><Download size={17}/></button>{user?.role === "ADMIN" && <button className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove.mutate(item.id)}><Trash2 size={17}/></button>}</div>; })}</div></Panel>
  </div></div>;
}
