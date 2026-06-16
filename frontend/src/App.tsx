import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.js";
import { useAuth } from "./context/AuthContext.js";
import { DashboardPage } from "./pages/Dashboard.js";
import { ImportsPage } from "./pages/Imports.js";
import { LoginPage } from "./pages/Login.js";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/Password.js";
import { RegisterPage } from "./pages/Register.js";
import { UsersPage } from "./pages/Users.js";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-400">Validando sessão...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/imports" element={<ImportsPage />} />
        <Route path="/uploads" element={<Navigate to="/imports" replace />} />
        <Route path="/users" element={user?.role === "ADMIN" ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
