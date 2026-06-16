import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, hasAccessToken, setAccessToken } from "../api/client.js";
import type { User } from "../types.js";

type AuthValue = { user: User | null; loading: boolean; login(email: string, senha: string): Promise<User>; logout(): Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

function useLocalSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!hasAccessToken()) {
      setLoading(false);
      return;
    }
    api.get("/auth/session").then(({ data }) => setUser(data.user)).catch(() => setAccessToken(null)).finally(() => setLoading(false));
  }, []);
  return { user, setUser, loading, setLoading };
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const session = useLocalSession();
  const value = useMemo<AuthValue>(() => ({ user: session.user, loading: session.loading, login: async (email, senha) => { const { data } = await api.post("/auth/login", { email, senha }); setAccessToken(data.token); session.setUser(data.user); return data.user; }, logout: async () => { setAccessToken(null); session.setUser(null); } }), [session.user, session.loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider ausente"); return value; };
