import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";

const brandLogo = `${import.meta.env.BASE_URL}brand/maravilha-logo-white.png`;

function SimpleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="login-bg grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl">
        <img className="mb-7 w-44 rounded-xl bg-radio p-3" src={brandLogo} alt="Rádio Maravilha FM 96.9" />
        <h1 className="mb-6 text-2xl font-black text-ink">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setMessage((await api.post("/auth/forgot-password", { email })).data.message);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  return (
    <SimpleCard title="Recuperar senha">
      <form onSubmit={submit}>
        <label className="field-label">
          Email
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <button className="button-primary mt-5 w-full">Enviar instruções</button>
        {message && <p className="mt-4 text-sm text-slate-500">{message}</p>}
        <Link className="mt-5 block text-center text-xs text-radio" to="/login">Voltar ao login</Link>
      </form>
    </SimpleCard>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (senha !== confirmarSenha) {
      setMessage("A confirmação de senha não confere.");
      return;
    }
    try {
      setMessage((await api.post("/auth/reset-password", { token: params.get("token"), senha })).data.message);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  return (
    <SimpleCard title="Definir nova senha">
      <form onSubmit={submit}>
        <label className="field-label">
          Nova senha
          <input className="input" type="password" minLength={8} value={senha} onChange={(event) => setSenha(event.target.value)} required />
        </label>
        <label className="field-label mt-4">
          Confirmar senha
          <input className="input" type="password" minLength={8} value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} required />
        </label>
        <button className="button-primary mt-5 w-full">Atualizar senha</button>
        {message && <p className="mt-4 text-sm text-slate-500">{message}</p>}
        <Link className="mt-5 block text-center text-xs text-radio" to="/login">Ir para o login</Link>
      </form>
    </SimpleCard>
  );
}
