import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { Repository } from "../types.js";
import type { createEmailService } from "../services/email/index.js";

const emailPattern = /^\S+@\S+\.\S+$/;
const validPassword = (password: string) => password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
const frontendUrl = (env: NodeJS.ProcessEnv, path = "") => {
  const base = (env.FRONTEND_PUBLIC_URL || env.FRONTEND_ORIGIN?.split(",")[0] || "http://localhost:5173").trim().replace(/\/$/, "");
  return `${base}${path}`;
};

export function createAuthController(repository: Repository, signLocalToken: (user: NonNullable<Request["user"]>) => string, emailService: ReturnType<typeof createEmailService>, env = process.env) {
  const safeUser = (user: NonNullable<Request["user"]>) => ({ id: user.id, nome: user.nome, email: user.email, role: user.role, ativo: user.ativo });
  return {
    login: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.senha ?? "");
        const user = await repository.findUserByEmail(email);
        if (!user?.ativo || !user.password_hash || !await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: "Email ou senha inválidos." });
        const token = signLocalToken(user);
        return res.json({ token, user: safeUser(user) });
      } catch (error) { return next(error); }
    },
    register: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const name = String(req.body?.nome ?? "").trim();
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.senha ?? "");
        const confirmation = String(req.body?.confirmarSenha ?? "");
        if (!name || !emailPattern.test(email)) return res.status(400).json({ error: "Informe nome e email válidos." });
        if (!validPassword(password)) return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres, incluindo letras e números." });
        if (password !== confirmation) return res.status(400).json({ error: "A confirmação de senha não confere." });
        if (await repository.findUserByEmail(email)) return res.status(409).json({ error: "Já existe uma conta com este email." });
        const user = await repository.createLocalUser({ name, email, passwordHash: await bcrypt.hash(password, 12), role: "VIEWER" });
        await emailService.send(user.email, "welcome", user.nome, frontendUrl(env, "/login")).catch(() => null);
        return res.status(201).json({ message: "Cadastro realizado. Você já pode entrar com email e senha." });
      } catch (error) { return next(error); }
    },
    session: (req: Request, res: Response) => res.json({ user: safeUser(req.user!) }),
    forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await repository.findUserByEmail(String(req.body?.email ?? "").trim().toLowerCase());
        if (user?.password_hash && user.ativo) {
          const token = crypto.randomBytes(32).toString("hex");
          const hash = crypto.createHash("sha256").update(token).digest("hex");
          await repository.createPasswordReset(user.id, hash, new Date(Date.now() + 60 * 60 * 1000));
          const url = frontendUrl(env, `/reset-password?token=${token}`);
          await emailService.send(user.email, "passwordReset", user.nome, url);
        }
        return res.json({ message: "Se o email estiver cadastrado, enviaremos as instruções." });
      } catch (error) { return next(error); }
    },
    resetPassword: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tokenHash = crypto.createHash("sha256").update(String(req.body?.token ?? "")).digest("hex");
        const user = await repository.consumePasswordReset(tokenHash);
        const password = String(req.body?.senha ?? "");
        if (!user || !validPassword(password)) return res.status(400).json({ error: "Token inválido/expirado ou senha deve ter letras, números e pelo menos 8 caracteres." });
        await repository.updateUserPassword(user.id, await bcrypt.hash(password, 12));
        return res.json({ message: "Senha atualizada." });
      } catch (error) { return next(error); }
    },
  };
}
