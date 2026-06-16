import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Repository, UserRole } from "../types.js";

const publicUser = (user: NonNullable<Request["user"]>) => ({ id: user.id, nome: user.nome, email: user.email, role: user.role, ativo: user.ativo });

export function createAuthMiddleware(repository: Repository, env = process.env) {
  const secret = env.JWT_SECRET || "dev-only-change-me";

  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      try {
        const payload = jwt.verify(token, secret) as { id: number };
        const user = await repository.getUserById(payload.id);
        if (!user?.ativo) return res.status(401).json({ error: "Usuário inativo ou inexistente." });
        req.user = user;
        return next();
      } catch {}
    }
    return res.status(401).json({ error: "Autenticação necessária." });
  };

  const requireRole = (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Você não possui permissão para esta ação." });
  const signLocalToken = (user: NonNullable<Request["user"]>) => jwt.sign(publicUser(user), secret, { expiresIn: (env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"] });
  return { authenticate, requireAdmin: requireRole("ADMIN"), requireEditor: requireRole("ADMIN", "ANALYST"), signLocalToken, secret };
}
