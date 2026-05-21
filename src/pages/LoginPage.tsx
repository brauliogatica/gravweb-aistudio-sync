import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import fondoCarousel from "../assets/fondoCarousel.jpg";
import logoBlanco from "../assets/Logo_blanco.png";
import carousel1 from "../assets/carousel1.png";
import carousel2 from "../assets/carousel2.png";
import carousel3 from "../assets/carousel3.png";
import { useAuthSession } from "../auth/AuthSessionProvider";
import { useCurrentUser } from "../auth/useCurrentUser";
import "./LoginPage.css";

const slides = [
  {
    image: carousel1,
    title: "Visualiza la distribución del agua",
    description: "Crea zonas de captación, acumulación y riego.",
  },
  {
    image: carousel2,
    title: "Automatiza el proceso hidrológico",
    description:
      "Genera rápidamente patrones de diseño óptimos para cualquier terreno.",
  },
  {
    image: carousel3,
    title: "Utiliza Realidad Aumentada",
    description:
      "Digitaliza tu gestión de aguas de lluvia en tu terreno con tecnología IA.",
  },
];

function LoginPage() {
  const { isAuthenticated } = useCurrentUser();
  const { login, source } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const from =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/analisis";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((slide) => (slide + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/analisis" replace />;
  }

  const enterWithAuth = async (mode: "login" | "register") => {
    await login({
      returnTo: from,
      screenHint: mode === "register" ? "signup" : undefined,
    });

    if (source === "local-dev") {
      navigate(from, { replace: true });
    }
  };

  return (
    <main className="componenteLogin">
      <section className="componenteInputs" aria-label="Acceso Gravitacional">
        <div className="containerInicio">
          <div className="inicio">
            <h1 className="titleInicio">Inicia sesión con tu cuenta</h1>
            <button
              type="button"
              className="btn btn-primary loginButtonOriginal"
              onClick={() => void enterWithAuth("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className="btn btn-primary loginButtonOriginal"
              onClick={() => void enterWithAuth("register")}
            >
              Registrarse
            </button>
          </div>
        </div>
      </section>

      <section
        className="componenteCarousel"
        style={{ backgroundImage: `url("${fondoCarousel}")` }}
        aria-label="Informacion Gravitacional"
      >
        <div className="componenteCarouselInterior">
          <div className="componenteInterior">
            <div className="divVertical">
              <div className="carousel">
                <div className="slide">
                  <img className="LogoBlanco" src={logoBlanco} alt="Gravitacional" />
                  <img
                    className="imgCarousel"
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                  />
                  <h4>{slides[currentSlide].title}</h4>
                  <p className="cssp">{slides[currentSlide].description}</p>
                </div>
              </div>

              <div className="navigation" aria-label="Seleccionar diapositiva">
                {slides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    className={`dot ${index === currentSlide ? "active" : ""}`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Mostrar ${slide.title}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
