import React, { Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import MainNavbar from "./components/mainNavbar/MainNavbar";
import AnalisisPage from "./pages/AnalisisPage";
import LoginPage from "./pages/LoginPage";
import ProjectsDashboardPage from "./pages/ProjectsDashboardPage";
import { useCurrentUser } from "./auth/useCurrentUser";
import "./App.css";

const TerrenoDemoPage = React.lazy(() => import("./pages/TerrenoDemoPage"));

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <div className="text-white p-4">Validando sesion...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return (
    <>
      <MainNavbar />
      <div className="content authenticated-content" style={{ marginTop: "50px" }}>
        {children}
      </div>
    </>
  );
}

function App() {
  const { isAuthenticated } = useCurrentUser();

  return (
    <div className="app-container">
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/analisis" replace /> : <LoginPage />
          }
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/analisis" : "/login"} replace />}
        />
        <Route
          path="/analisis"
          element={
            <AuthenticatedShell>
              <AnalisisPage />
            </AuthenticatedShell>
          }
        />
        <Route
          path="/proyectos"
          element={
            <AuthenticatedShell>
              <ProjectsDashboardPage />
            </AuthenticatedShell>
          }
        />
        <Route
          path="/particles"
          element={
            <AuthenticatedShell>
              <Suspense fallback={<div className="text-white p-4">Cargando terreno demo...</div>}>
                <TerrenoDemoPage />
              </Suspense>
            </AuthenticatedShell>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
