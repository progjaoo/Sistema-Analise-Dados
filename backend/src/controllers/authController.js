import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const DEMO_USER = {
  id: 1,
  nome: "Administrador Maravilha",
  email: "admin@maravilhafm.com.br",
  perfil: "admin",
};

export function createAuthController({ repository, secret, env = process.env }) {
  const expiresIn = env.JWT_EXPIRES_IN || "8h";
  const demoLoginEnabled = env.NODE_ENV !== "production" || env.ALLOW_DEMO_LOGIN === "true";

  return {
    login: async (req, res, next) => {
      try {
        const { email, senha } = req.body ?? {};
        if (!email || !senha) return res.status(400).json({ error: "Informe email e senha." });

        const storedUser = repository.findUserByEmail
          ? await repository.findUserByEmail(email)
          : null;
        const validStoredPassword = storedUser
          ? await bcrypt.compare(senha, storedUser.senha)
          : false;
        const demoLogin =
          demoLoginEnabled &&
          !storedUser &&
          email === DEMO_USER.email &&
          senha === "maravilha123";

        if (!validStoredPassword && !demoLogin) {
          return res.status(401).json({ error: "Email ou senha inválidos." });
        }

        const source = storedUser ?? DEMO_USER;
        const user = {
          id: source.id,
          nome: source.nome,
          email: source.email,
          perfil: source.perfil,
        };
        const token = jwt.sign(user, secret, { expiresIn });
        return res.json({ token, user });
      } catch (error) {
        return next(error);
      }
    },
    me: (req, res) => res.json({ user: req.user }),
  };
}
