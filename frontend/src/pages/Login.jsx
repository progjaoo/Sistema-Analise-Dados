import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@maravilhafm.com.br");
  const [senha, setSenha] = useState("maravilha123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <main className="login-bg min-h-screen p-5 sm:grid sm:place-items-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-slate-950/30 lg:grid-cols-[1.1fr_.9fr]">
        <section className="hidden min-h-[620px] bg-radio p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <img className="h-auto w-64" src="/brand/maravilha-logo-white.png" alt="Rádio Maravilha FM 96.9" />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-orange-100">Audience Intelligence</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.05]">Audiência clara.<br />Decisão rápida.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-orange-50">Centralize relatórios Ibope, descubra os horários de maior impacto e acompanhe a posição da Maravilha frente às concorrentes.</p>
          </div>
          <p className="text-xs text-orange-100">Uso interno • Dados Ibope/Kantar</p>
        </section>
        <section className="flex min-h-[620px] items-center p-7 sm:p-12">
          <form className="w-full" onSubmit={submit}>
            <p className="eyebrow">Acesso seguro</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Entrar no painel</h2>
            <p className="mt-2 text-sm text-slate-500">Use suas credenciais internas.</p>
            <label className="field-label mt-8">Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="field-label mt-4">Senha<input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></label>
            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button className="button-primary mt-6 w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
            <p className="mt-5 text-center text-xs text-slate-400">Sessão mantida somente enquanto esta página estiver aberta.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
