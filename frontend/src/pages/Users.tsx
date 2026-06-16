import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../api/client.js";
import { PageHeader, Panel } from "../components/ui.js";
import type { User, UserRole } from "../types.js";

const emptyForm = { nome: "", email: "", senha: "", role: "VIEWER" as UserRole };

export function UsersPage() {
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [passwords, setPasswords] = useState<Record<number, string>>({});

  const users = useQuery<User[]>({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data.users });

  const create = useMutation({
    mutationFn: () => api.post("/users", form),
    onSuccess: () => {
      setForm(emptyForm);
      setMessage("Usuário criado e convite processado.");
      client.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  const toggle = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => api.patch(`/users/${id}/active`, { ativo }),
    onSuccess: (response) => {
      setMessage(response.data?.message || "Status do usuário atualizado.");
      client.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  const updatePassword = useMutation({
    mutationFn: ({ id, senha }: { id: number; senha: string }) => api.patch(`/users/${id}/password`, { senha }),
    onSuccess: (response, variables) => {
      setPasswords((current) => ({ ...current, [variables.id]: "" }));
      setMessage(response.data?.message || "Senha atualizada.");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  const submitPassword = (event: FormEvent, user: User) => {
    event.preventDefault();
    updatePassword.mutate({ id: user.id, senha: passwords[user.id] || "" });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Administração" title="Usuários" description="Crie acessos, altere senhas e controle contas ativas." />
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Panel title="Criar usuário local">
          <form onSubmit={submit} className="space-y-4">
            <label className="field-label">
              Nome
              <input className="input" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required />
            </label>
            <label className="field-label">
              Email
              <input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="field-label">
              Senha inicial
              <input className="input" type="password" minLength={8} value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} required />
              <span className="mt-1 text-xs font-normal text-slate-400">Mínimo de 8 caracteres, com letras e números.</span>
            </label>
            <label className="field-label">
              Perfil
              <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
                <option>VIEWER</option>
                <option>ANALYST</option>
                <option>ADMIN</option>
              </select>
            </label>
            {message && <p className="rounded-xl bg-orange-50 p-3 text-sm text-brand-deeper">{message}</p>}
            <button className="button-primary w-full" disabled={create.isPending}>{create.isPending ? "Criando..." : "Criar acesso"}</button>
          </form>
        </Panel>

        <Panel title="Contas cadastradas">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Nova senha</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nome}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td><span className={`filter-chip ${user.ativo ? "filter-chip-active" : ""}`}>{user.ativo ? "Ativo" : "Inativo"}</span></td>
                    <td>
                      <form className="flex min-w-[220px] gap-2" onSubmit={(event) => submitPassword(event, user)}>
                        <input
                          className="input h-9"
                          type="password"
                          minLength={8}
                          placeholder="Nova senha"
                          value={passwords[user.id] || ""}
                          onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                        />
                        <button className="rounded-xl bg-ink px-3 text-xs font-bold text-white disabled:opacity-50" disabled={updatePassword.isPending || !(passwords[user.id] || "").trim()}>Salvar</button>
                      </form>
                    </td>
                    <td>
                      <button
                        className={`filter-chip ${user.ativo ? "border-red-200 text-red-600 hover:bg-red-50" : "filter-chip-active"}`}
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: user.id, ativo: !user.ativo })}
                      >
                        {user.ativo ? "Inativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
