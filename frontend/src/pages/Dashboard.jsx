import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client.js";
import { EmptyState, PageHeader } from "../components/ui.jsx";
import {
  AnaliseCompetitiva,
  FaixaHoraria,
  MaravilhaDiaDia,
  MaravilhaSomatorio,
  RankingGeral,
  TodasEmissoras,
} from "../views/index.jsx";

const views = [
  ["ranking", "Ranking geral", RankingGeral],
  ["dia", "Maravilha: dia a dia", MaravilhaDiaDia],
  ["soma", "Maravilha: somatório", MaravilhaSomatorio],
  ["emissoras", "Todas as emissoras", TodasEmissoras],
  ["competitiva", "Análise competitiva", AnaliseCompetitiva],
  ["faixa", "Faixa horária", FaixaHoraria],
];

export function DashboardPage() {
  const [view, setView] = useState("ranking");
  const [selectedUpload, setSelectedUpload] = useState("");
  const uploads = useQuery({
    queryKey: ["uploads"],
    queryFn: async () => (await api.get("/uploads")).data.uploads,
  });
  const uploadId = selectedUpload || uploads.data?.[0]?.id || "";
  const active = views.find(([id]) => id === view);
  const View = active[2];

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Ibope / Ouvintes por minuto"
        title="Painel de audiência"
        description="Leitura executiva do desempenho da Maravilha FM, horários de pico e posição competitiva."
        actions={<label className="select-wrap"><span>Período</span><select value={uploadId} onChange={(event) => setSelectedUpload(event.target.value)}>{uploads.data?.map((upload) => <option key={upload.id} value={upload.id}>{upload.periodo}</option>)}</select></label>}
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {views.map(([id, label]) => <button key={id} className={`tab-button ${view === id ? "tab-button-active" : ""}`} onClick={() => setView(id)}>{label}</button>)}
      </div>

      {!uploads.isLoading && !uploadId ? <EmptyState /> : uploadId ? <View uploadId={Number(uploadId)} /> : null}
    </div>
  );
}
