import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import type { Repository, UserRole } from "../types.js";
import type { createEmailService } from "../services/email/index.js";

const roles = new Set<UserRole>(["ADMIN", "ANALYST", "VIEWER"]);
const frontendUrl = (env: NodeJS.ProcessEnv) => (env.FRONTEND_PUBLIC_URL || env.FRONTEND_ORIGIN?.split(",")[0] || "http://localhost:5173").trim().replace(/\/$/, "");
const validPassword = (password: string) => password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

export function createUserController(repository: Repository, emailService: ReturnType<typeof createEmailService>, env = process.env) {
  return {
    list: async (_req: Request, res: Response, next: NextFunction) => { try { return res.json({ users: await repository.listUsers() }); } catch (error) { return next(error); } },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const name = String(req.body?.nome ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.senha ?? "");
        const role = String(req.body?.role ?? "VIEWER").toUpperCase() as UserRole;
        if (!name || !/^\S+@\S+\.\S+$/.test(email) || !validPassword(password) || !roles.has(role)) return res.status(400).json({ error: "Informe nome, email, senha com 8+ caracteres, letras, números e perfil válido." });
        const user = await repository.createLocalUser({ name, email, passwordHash: await bcrypt.hash(password, 12), role });
        const loginUrl = frontendUrl(env);
        await emailService.send(email, "invitation", name, loginUrl).catch(() => null);
        return res.status(201).json({ user: { ...user, password_hash: undefined } });
      } catch (error) { return next(error); }
    },
    setActive: async (req: Request, res: Response, next: NextFunction) => { try { const changed = await repository.setUserActive(Number(req.params.id), Boolean(req.body?.ativo)); return changed ? res.json({ ok: true }) : res.status(404).json({ error: "Usuário não encontrado." }); } catch (error) { return next(error); } },
  };
}
