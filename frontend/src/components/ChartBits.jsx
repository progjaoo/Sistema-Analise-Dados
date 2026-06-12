import { formatOpm, shortStation } from "../lib/format.js";

export function AudienceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-bold text-ink">{label}</p>
      {payload.map((item) => <div className="flex items-center justify-between gap-5 text-xs" key={item.dataKey}><span style={{ color: item.color }}>{shortStation(String(item.name))}</span><strong>{formatOpm(item.value, 1)} OPM</strong></div>)}
    </div>
  );
}

export const chartMargin = { top: 8, right: 18, left: 4, bottom: 8 };
