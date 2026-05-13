import React from "react";
import logoBlanco from "../../assets/isotipo_blanco2.png";
import { useLocation } from "react-router-dom";
import "./mainNavbar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { useLoadDemoProject } from "../guardarProyectos/useLoadDemoProject";
import CheckStatus from "../rhinoCompute/checkStatus";

function MainNavbar() {
  const location = useLocation();
  const loadDemoProject = useLoadDemoProject();

  return (
    <nav
      className="navbar bg-gradient-primary fixed-top navbar-expand-lg"
      id="mainNavbar"
    >
      <div className="container-fluid">
        <a className="navbar-brand text-light" href="/analisis">
          <img
            src={logoBlanco}
            alt="Logo"
            width="30"
            height="auto"
            className="d-inline-block align-text-top"
          />
          Gravitacional
        </a>
        <>
          <button
            className="navbar-toggler navbar-dark"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon "></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === "/analisis" ? "active" : ""}`}
                  href="/analisis"
                >
                  Análisis
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === "/particles" ? "active" : ""}`}
                  type="button"
                  onClick={loadDemoProject}
                >
                  Terreno Demo
                </a>
              </li>
            </ul>
          </div>
          <div className="p-1">
            <CheckStatus />
          </div>
        </>
      </div>
    </nav>
  );
}

export default MainNavbar;
