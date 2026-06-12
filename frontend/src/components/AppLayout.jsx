import { BarChart3, Database, LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-orange-50/60 text-slate-900 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/20 bg-radio px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
        <div className="border-b border-white/25 pb-5">
          <img className="h-auto w-44" src="/brand/maravilha-logo-white.png" alt="Rádio Maravilha FM 96.9" />
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-orange-100">Inteligência de audiência</p>
            <h1 className="mt-1 text-sm font-bold">Audience Intelligence</h1>
          </div>
        </div>

        <nav className="mt-5 flex gap-2 lg:flex-col">
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`} to="/dashboard"><BarChart3 size={18} />Dashboard</NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`} to="/uploads"><Database size={18} />Relatórios</NavLink>
        </nav>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-deeper/25 p-3 lg:absolute lg:bottom-5 lg:left-5 lg:right-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.nome}</p>
            <p className="text-xs text-orange-100">{user.perfil}</p>
          </div>
          <button className="rounded-xl p-2 text-orange-100 hover:bg-white/15 hover:text-white" onClick={logout} title="Sair"><LogOut size={18} /></button>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 xl:p-8"><Outlet /></main>
    </div>
  );
}
