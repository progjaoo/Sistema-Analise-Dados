import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { AppLayout } from "./components/AppLayout.jsx";
import { DashboardPage } from "./pages/Dashboard.jsx";
import { LoginPage } from "./pages/Login.jsx";
import { UploadsPage } from "./pages/Uploads.jsx";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
