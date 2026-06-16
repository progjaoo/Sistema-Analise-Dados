import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) { return <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-1 text-3xl font-black text-ink">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>}</div>{actions}</header>; }
export function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) { return <section className="panel"><div className="mb-4"><h2 className="font-bold text-ink">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}</div>{children}</section>; }
export function Loading() { return <div className="panel py-16 text-center text-sm text-slate-400">Carregando análise...</div>; }
export function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{message}</div>; }
export function EmptyState({ text = "Nenhuma importação disponível." }: { text?: string }) { return <div className="panel grid min-h-64 place-items-center text-center"><div><BarChart3 className="mx-auto text-brand-light" size={38}/><p className="mt-3 text-sm text-slate-400">{text}</p></div></div>; }
export function Kpi({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) { return <div className="kpi-card"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-ink">{value}</p>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}</div>; }
