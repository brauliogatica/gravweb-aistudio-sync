import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainNavbar from "./components/mainNavbar/MainNavbar";
import AnalisisPage from "./pages/AnalisisPage";
import ProjectsDashboardPage from "./pages/ProjectsDashboardPage";
import "./App.css";

const TerrenoDemoPage = React.lazy(() => import("./pages/TerrenoDemoPage"));

function App() {
  return (
    <div className="app-container">
      <MainNavbar />
      <div className="content" style={{ marginTop: "50px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/analisis" replace />} />
          <Route path="/analisis" element={<AnalisisPage />} />
          <Route path="/proyectos" element={<ProjectsDashboardPage />} />
          <Route
            path="/particles"
            element={
              <Suspense fallback={<div className="text-white p-4">Cargando terreno demo...</div>}>
                <TerrenoDemoPage />
              </Suspense>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
