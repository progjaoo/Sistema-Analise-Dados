import { BarChart3, Database, LogOut, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

const brandLogo = `${import.meta.env.BASE_URL}brand/maravilha-logo-white.png`;

export function AppLayout() {
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "nav-link-active" : ""}`;
  return <div className="min-h-screen bg-orange-50/60 text-slate-900 lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="border-b border-white/20 bg-radio px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
      <div className="border-b border-white/25 pb-5"><img className="h-auto w-44" src={brandLogo} alt="Rádio Maravilha FM 96.9"/><p className="mt-3 text-[10px] font-semibold uppercase tracking-[.24em] text-orange-100">Inteligência de audiência</p></div>
      <nav className="mt-5 flex gap-2 lg:flex-col"><NavLink className={link} to="/dashboard"><BarChart3 size={18}/>Dashboard</NavLink><NavLink className={link} to="/imports"><Database size={18}/>Importações</NavLink>{user?.role === "ADMIN" && <NavLink className={link} to="/users"><Users size={18}/>Usuários</NavLink>}</nav>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-deeper/25 p-3 lg:absolute lg:bottom-5 lg:left-5 lg:right-5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.nome}</p><p className="text-xs text-orange-100">{user?.role}</p></div><button className="rounded-xl p-2 hover:bg-white/15" onClick={() => logout()} title="Sair"><LogOut size={18}/></button></div>
    </aside><main className="min-w-0 p-4 sm:p-6 xl:p-8"><Outlet/></main>
  </div>;
}
