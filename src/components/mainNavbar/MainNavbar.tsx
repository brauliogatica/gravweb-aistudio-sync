import React from "react";
import logoBlanco from "../../assets/isotipo_blanco2.png";
import { Link, NavLink } from "react-router-dom";
import "./mainNavbar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { useLoadDemoProject } from "../guardarProyectos/useLoadDemoProject";
import CheckStatus from "../rhinoCompute/checkStatus";
import { useAuthSession } from "../../auth/AuthSessionProvider";
import { useCurrentUser } from "../../auth/useCurrentUser";

function MainNavbar() {
  const loadDemoProject = useLoadDemoProject();
  const { logout } = useAuthSession();
  const { user } = useCurrentUser();
  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? "active" : ""}`;

  return (
    <nav
      className="navbar bg-gradient-primary fixed-top navbar-expand-lg"
      id="mainNavbar"
    >
      <div className="container-fluid">
        <Link className="navbar-brand text-light" to="/analisis">
          <img
            src={logoBlanco}
            alt="Logo"
            width="30"
            height="auto"
            className="d-inline-block align-text-top"
          />
          Gravitacional
        </Link>
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
                <NavLink className={navLinkClassName} to="/analisis">
                  Analisis
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={navLinkClassName} to="/proyectos">
                  Proyectos
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  className={navLinkClassName}
                  to="/particles?demo=1"
                  onClick={(event) => {
                    event.preventDefault();
                    loadDemoProject();
                  }}
                >
                  Terreno Demo
                </NavLink>
              </li>
            </ul>
          </div>
          <div className="p-1">
            <CheckStatus />
          </div>
          {user && (
            <div className="navbar-user">
              <span>{user.email || user.name}</span>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => logout()}
              >
                Salir
              </button>
            </div>
          )}
        </>
      </div>
    </nav>
  );
}

export default MainNavbar;
