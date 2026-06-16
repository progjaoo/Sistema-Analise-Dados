import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const brandLogo = `${import.meta.env.BASE_URL}brand/maravilha-logo-white.png`;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-bg min-h-screen p-5 sm:grid sm:place-items-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-slate-950/30 lg:grid-cols-[1.1fr_.9fr]">
        <section className="hidden min-h-[620px] bg-radio p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <img className="h-auto w-64" src={brandLogo} alt="Rádio Maravilha FM 96.9" />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-orange-100">Análise de Audiência</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.05]">Análises com base nos dados do IBOPE MEDIA.</h1>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center p-7 sm:p-12">
          <form className="w-full" onSubmit={submit}>
            <div className="mb-8 rounded-3xl bg-radio px-6 py-7 shadow-lg shadow-orange-200 lg:hidden">
              <img className="mx-auto h-auto w-56" src={brandLogo} alt="Rádio Maravilha FM 96.9" />
            </div>

            <h2 className="mt-2 text-3xl font-black text-ink">Entrar no painel</h2>
            {typeof location.state === "object" && location.state && "message" in location.state && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-brand-deeper">{String(location.state.message)}</p>}

            <label className="field-label mt-8">
              Email
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            <label className="field-label mt-4">
              Senha
              <input className="input" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required />
            </label>

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <button className="button-primary mt-6 w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar com email e senha"}
            </button>

            <button type="button" className="mt-5 w-full text-xs text-slate-400 hover:text-radio" onClick={() => navigate("/forgot-password")}>
              Esqueci minha senha
            </button>
            <Link className="mt-3 block text-center text-xs font-bold text-radio" to="/register">Criar cadastro</Link>
          </form>
        </section>
      </div>
    </main>
  );
}
