import jwt from "jsonwebtoken";

export const createAuthMiddleware = (env = process.env) => {
  const secret = env.JWT_SECRET || "dev-only-change-me";

  const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Autenticação necessária." });
    try {
      req.user = jwt.verify(token, secret);
      return next();
    } catch {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
  };

  const requireAdmin = (req, res, next) =>
    req.user?.perfil === "admin"
      ? next()
      : res.status(403).json({ error: "Ação permitida apenas para administradores." });

  return { authenticate, requireAdmin, secret };
};
