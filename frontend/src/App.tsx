import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.js";
import { useAuth } from "./context/AuthContext.js";
import { LoginPage } from "./pages/Login.js";

const DashboardPage = lazy(() => import("./pages/Dashboard.js").then((module) => ({ default: module.DashboardPage })));
const ImportsPage = lazy(() => import("./pages/Imports.js").then((module) => ({ default: module.ImportsPage })));
const UsersPage = lazy(() => import("./pages/Users.js").then((module) => ({ default: module.UsersPage })));
const RegisterPage = lazy(() => import("./pages/Register.js").then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("./pages/Password.js").then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/Password.js").then((module) => ({ default: module.ResetPasswordPage })));

function RouteLoading() {
  return <div className="grid min-h-screen place-items-center text-slate-400">Carregando...</div>;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-400">Validando sessão...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<RouteLoading />}>
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
    </Suspense>
  );
}
