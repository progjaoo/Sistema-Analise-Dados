import { AlertCircle, LoaderCircle } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && <div className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="font-bold text-ink">{title}</h3>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>
        {actions}
      </div>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, detail, accent = "radio" }) {
  const classes = accent === "signal" ? "from-amber-400 to-orange-500" : accent === "violet" ? "from-orange-300 to-amber-500" : "from-brand to-brand-dark";
  return (
    <div className="panel relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${classes}`} />
      <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export function Loading() {
  return <div className="panel grid min-h-48 place-items-center text-sm text-slate-500"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} />Carregando audiência...</span></div>;
}

export function ErrorState({ message }) {
  return <div className="panel flex min-h-40 items-center justify-center gap-2 text-sm text-red-600"><AlertCircle size={18} />{message}</div>;
}

export function EmptyState({ title = "Nenhum relatório importado", description = "Acesse Relatórios e envie uma planilha Ibope para começar." }) {
  return <div className="panel grid min-h-64 place-items-center text-center"><div><RadioIcon /><h3 className="mt-3 font-bold text-ink">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>;
}

function RadioIcon() {
  return <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-light text-radio"><span className="text-xl">OPM</span></div>;
}
