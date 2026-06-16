import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";

const brandLogo = `${import.meta.env.BASE_URL}brand/maravilha-logo-white.png`;

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", confirmarSenha: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (form.senha !== form.confirmarSenha) {
      setMessage("A confirmação de senha não confere.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login", { replace: true, state: { message: "Cadastro realizado. Entre com seu email e senha." } });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-bg grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl">
        <img className="mb-7 w-48 rounded-xl bg-radio p-3" src={brandLogo} alt="Rádio Maravilha FM 96.9" />
        <p className="eyebrow">Novo acesso</p>
        <h1 className="mt-2 text-2xl font-black text-ink">Criar cadastro</h1>
        <p className="mt-2 text-sm text-slate-500">Seu perfil inicial será VIEWER. Perfis administrativos são gerenciados pelo sistema.</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="field-label">Nome<input className="input" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required /></label>
          <label className="field-label">Email<input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label className="field-label">Senha<input className="input" type="password" minLength={8} value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} required /></label>
          <label className="field-label">Confirmar senha<input className="input" type="password" minLength={8} value={form.confirmarSenha} onChange={(event) => setForm({ ...form, confirmarSenha: event.target.value })} required /></label>
          {message && <p className="rounded-xl bg-orange-50 p-3 text-sm text-brand-deeper">{message}</p>}
          <button className="button-primary w-full" disabled={loading}>{loading ? "Criando cadastro..." : "Criar cadastro"}</button>
        </form>

        <Link className="mt-5 block text-center text-xs font-bold text-radio" to="/login">Já tenho cadastro</Link>
      </div>
    </main>
  );
}

