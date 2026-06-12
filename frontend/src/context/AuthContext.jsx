import { createContext, useContext, useMemo, useState } from "react";
import { api, setAccessToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const value = useMemo(() => ({
    user,
    login: async (email, senha) => {
      const { data } = await api.post("/auth/login", { email, senha });
      setAccessToken(data.token);
      setUser(data.user);
      return data.user;
    },
    logout: () => {
      setAccessToken(null);
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
