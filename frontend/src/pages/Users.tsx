import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../api/client.js";
import { PageHeader, Panel } from "../components/ui.js";
import type { User, UserRole } from "../types.js";

export function UsersPage() {
  const client = useQueryClient(); const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "VIEWER" as UserRole }); const [message, setMessage] = useState("");
  const users = useQuery<User[]>({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data.users });
  const create = useMutation({ mutationFn: () => api.post("/users", form), onSuccess: () => { setForm({ nome: "", email: "", senha: "", role: "VIEWER" }); setMessage("Usuário criado e convite processado."); client.invalidateQueries({ queryKey: ["users"] }); }, onError: (error) => setMessage(errorMessage(error)) });
  const toggle = useMutation({ mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => api.patch(`/users/${id}/active`, { ativo }), onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }) });
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate(); };
  return <div className="mx-auto max-w-6xl"><PageHeader eyebrow="Administração" title="Usuários" description="Crie e gerencie acessos por email e senha."/><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
    <Panel title="Criar usuário local"><form onSubmit={submit} className="space-y-4"><label className="field-label">Nome<input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required/></label><label className="field-label">Email<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required/></label><label className="field-label">Senha inicial<input className="input" type="password" minLength={8} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required/></label><label className="field-label">Perfil<select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}><option>VIEWER</option><option>ANALYST</option><option>ADMIN</option></select></label>{message && <p className="rounded-xl bg-orange-50 p-3 text-sm text-brand-deeper">{message}</p>}<button className="button-primary w-full" disabled={create.isPending}>Criar acesso</button></form></Panel>
    <Panel title="Contas cadastradas"><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Status</th></tr></thead><tbody>{users.data?.map((user) => <tr key={user.id}><td>{user.nome}</td><td>{user.email}</td><td>{user.role}</td><td><button className={`filter-chip ${user.ativo ? "filter-chip-active" : ""}`} onClick={() => toggle.mutate({ id: user.id, ativo: !user.ativo })}>{user.ativo ? "Ativo" : "Inativo"}</button></td></tr>)}</tbody></table></div></Panel>
  </div></div>;
}
