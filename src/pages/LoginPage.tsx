import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import logoBlanco from "../assets/isotipo_blanco2.png";
import { saveDefaultLocalAuthUser, saveLocalAuthUser } from "../auth/localAuthSession";
import { useCurrentUser } from "../auth/useCurrentUser";
import "./LoginPage.css";

function LoginPage() {
  const { isAuthenticated } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("local@gravitacional.dev");
  const [error, setError] = useState<string | null>(null);

  const from =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/analisis";

  if (isAuthenticated) {
    return <Navigate to="/analisis" replace />;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Ingresa un correo valido.");
      return;
    }

    saveLocalAuthUser({
      name: mode === "register" ? name : name || cleanEmail.split("@")[0],
      email: cleanEmail,
    });

    navigate(from, { replace: true });
  };

  const handleQuickAccess = () => {
    saveDefaultLocalAuthUser();
    navigate(from, { replace: true });
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Autenticacion Gravitacional">
        <div className="login-brand">
          <img src={logoBlanco} alt="Gravitacional" />
          <span>Gravitacional</span>
        </div>

        <div className="login-copy">
          <h1>{mode === "login" ? "Inicia sesion" : "Crea tu cuenta"}</h1>
          <p>
            Cada terreno procesado quedara asociado al usuario activo en este
            equipo.
          </p>
        </div>

        <div className="login-tabs" role="tablist">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Iniciar sesion
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Registrarse
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Nombre
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-primary">
            {mode === "login" ? "Entrar" : "Crear y entrar"}
          </button>

          <button
            type="button"
            className="login-secondary"
            onClick={handleQuickAccess}
          >
            Entrar como desarrollo local
          </button>
        </form>
      </section>

      <section className="login-preview" aria-hidden="true">
        <div className="login-preview-card">
          <span>Terrenos por usuario</span>
          <strong>/proyectos</strong>
        </div>
        <div className="login-grid" />
      </section>
    </main>
  );
}

export default LoginPage;
