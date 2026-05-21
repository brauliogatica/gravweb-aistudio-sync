import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import WaterParticle from "../components/waterParticles/WaterParticle";
import { updateProject } from "../redux/slices/projectSlice";
import type { RootState } from "../redux/store/store";
import { loadDemoProjectData } from "../services/demoProjectLoader";
import { loadProcessingRequest } from "../services/processingRequestService";
import {
  getRhinoComputeUrl,
  solveTerrainWithGrasshopper,
} from "../services/rhinoComputeService";
import type { GrasshopperTerrainResult, ProcessingRequest } from "../types/types";

type ViewState =
  | "idle"
  | "awaiting-process"
  | "loading-demo"
  | "processing"
  | "ready"
  | "error";

const hasTerrainData = (value: unknown) => {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const formatHectares = (areaM2?: number) => {
  if (!Number.isFinite(areaM2)) return "sin area";
  return `${((areaM2 ?? 0) / 10000).toFixed(2)} ha`;
};

function TerrenoDemoPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const project = useSelector((state: RootState) => state.project);
  const demoMode = useMemo(
    () => new URLSearchParams(location.search).get("demo") === "1",
    [location.search]
  );

  const [processingRequest, setProcessingRequest] =
    useState<ProcessingRequest | null>(null);
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<GrasshopperTerrainResult | null>(null);
  const [lastProcessedRequestId, setLastProcessedRequestId] =
    useState<string | null>(null);

  const terrainReady =
    hasTerrainData(project.genJson) && hasTerrainData(project.lineasJson);

  useEffect(() => {
    setProcessingRequest(loadProcessingRequest());
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (viewState === "idle" && terrainReady && !processingRequest && !demoMode) {
      setViewState("ready");
    }
  }, [demoMode, processingRequest, terrainReady, viewState]);

  useEffect(() => {
    if (!demoMode) return;

    let cancelled = false;
    setViewState("loading-demo");
    setMessage("Cargando terreno demo...");
    setError("");
    setResult(null);

    loadDemoProjectData(dispatch)
      .then(() => {
        if (cancelled) return;
        setMessage("");
        setViewState("ready");
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el terreno demo."
        );
        setMessage("");
        setViewState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode, dispatch]);

  useEffect(() => {
    if (demoMode || !processingRequest || terrainReady) return;
    if (viewState === "processing" || viewState === "error") return;

    setViewState("awaiting-process");
    setMessage(
      "Solicitud recibida. Puedes procesar con Grasshopper o cargar el terreno demo."
    );
    setError("");
  }, [demoMode, processingRequest, terrainReady, viewState]);

  const processWithGrasshopper = useCallback(() => {
    if (!processingRequest) {
      setError("No hay una solicitud de terreno activa.");
      setViewState("error");
      return;
    }

    if (lastProcessedRequestId === processingRequest.id && viewState === "ready") {
      return;
    }

    let active = true;
    setLastProcessedRequestId(processingRequest.id);
    setViewState("processing");
    setMessage("Procesando terreno con Grasshopper...");
    setError("");
    setResult(null);

    if (!getRhinoComputeUrl()) {
      setMessage("");
      setError("VITE_RHINO_COMPUTE_URL no esta configurado.");
      setViewState("error");
      return;
    }

    solveTerrainWithGrasshopper(processingRequest, project)
      .then(({ result: grasshopperResult, updates }) => {
        if (!active) return;

        Object.entries(updates).forEach(([key, value]) => {
          dispatch(updateProject({ key, value }));
        });

        dispatch(
          updateProject({ key: "coordinates", value: processingRequest.polygon })
        );

        if (processingRequest.centroid) {
          dispatch(
            updateProject({
              key: "coordinatesCenter",
              value: processingRequest.centroid,
            })
          );
        }

        if (Number.isFinite(processingRequest.areaM2)) {
          dispatch(
            updateProject({
              key: "areaTerrenoM2",
              value: processingRequest.areaM2,
            })
          );
        }

        setResult(grasshopperResult);
        setMessage("");
        setViewState("ready");
      })
      .catch((solveError) => {
        if (!active) return;
        setError(
          solveError instanceof Error
            ? solveError.message
            : "No se pudo procesar el terreno con Grasshopper."
        );
        setMessage("");
        setViewState("error");
      });

    return () => {
      active = false;
    };
  }, [
    dispatch,
    lastProcessedRequestId,
    processingRequest,
    project,
    viewState,
  ]);

  useEffect(() => {
    if (demoMode || !processingRequest) return;
    if (viewState === "processing") return;
    if (lastProcessedRequestId === processingRequest.id) return;

    processWithGrasshopper();
  }, [
    demoMode,
    lastProcessedRequestId,
    processingRequest,
    processWithGrasshopper,
    viewState,
  ]);

  const openDemo = () => {
    navigate("/particles?demo=1");
  };

  const retryProcessing = () => {
    setLastProcessedRequestId(null);
    setError("");
    setMessage("");
    setViewState("idle");
  };

  if (viewState === "ready" || (viewState === "idle" && terrainReady)) {
    return (
      <>
        <WaterParticle />
        {result && (
          <CompactStatus>
            <strong>Terreno procesado por Grasshopper</strong>
            <span>
              HTTP {result.status} - {result.durationMs} ms -{" "}
              {result.updatedKeys.length} campos aplicados
            </span>
          </CompactStatus>
        )}
      </>
    );
  }

  return (
    <StatusScreen
      title={
        viewState === "processing"
          ? "Procesando terreno"
          : viewState === "loading-demo"
            ? "Cargando terreno demo"
            : "Visualizador de terreno"
      }
      message={
        message ||
        error ||
        "Selecciona un terreno en Analisis o abre el terreno demo."
      }
      error={viewState === "error" ? error : ""}
      processingRequest={processingRequest}
      onOpenDemo={openDemo}
      onRetry={
        viewState === "error" && processingRequest ? retryProcessing : undefined
      }
      onBack={() => navigate("/analisis")}
    />
  );
}

function StatusScreen({
  title,
  message,
  error,
  processingRequest,
  onOpenDemo,
  onProcess,
  onRetry,
  onBack,
}: {
  title: string;
  message: string;
  error: string;
  processingRequest: ProcessingRequest | null;
  onOpenDemo: () => void;
  onProcess?: () => void;
  onRetry?: () => void;
  onBack: () => void;
}) {
  return (
    <div style={styles.screen}>
      <div style={styles.panel}>
        <h1 style={styles.title}>{title}</h1>
        <p style={error ? styles.errorText : styles.message}>{message}</p>

        {processingRequest && (
          <div style={styles.meta}>
            <span>Solicitud: {processingRequest.id}</span>
            <span>Puntos: {processingRequest.polygon.length}</span>
            <span>Area: {formatHectares(processingRequest.areaM2)}</span>
          </div>
        )}

        <div style={styles.actions}>
          {onProcess && (
            <button style={styles.primaryButton} onClick={onProcess}>
              Procesar con Grasshopper
            </button>
          )}
          {onRetry && (
            <button style={styles.primaryButton} onClick={onRetry}>
              Reintentar procesamiento
            </button>
          )}
          <button style={styles.primaryButton} onClick={onOpenDemo}>
            Terreno Demo
          </button>
          <button style={styles.secondaryButton} onClick={onBack}>
            Volver a Analisis
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactStatus({ children }: { children: React.ReactNode }) {
  return <div style={styles.compactStatus}>{children}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "calc(100vh - 74px)",
    background: "#0b1628",
    color: "#f8fbff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "96px 24px 32px",
  },
  panel: {
    width: "min(720px, 100%)",
    border: "1px solid rgba(119, 184, 255, 0.35)",
    borderRadius: 8,
    background: "#091222",
    padding: 24,
    boxShadow: "0 18px 50px rgba(0, 0, 0, 0.28)",
  },
  title: {
    margin: "0 0 12px",
    fontSize: 28,
    fontWeight: 700,
  },
  message: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.5,
  },
  errorText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.5,
    color: "#ffb8b8",
  },
  meta: {
    display: "grid",
    gap: 6,
    marginTop: 18,
    color: "#cfe7ff",
    fontSize: 14,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 22,
  },
  primaryButton: {
    border: "1px solid #25a9e9",
    borderRadius: 6,
    background: "#0ea5e9",
    color: "white",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: 6,
    background: "transparent",
    color: "white",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
  },
  compactStatus: {
    position: "fixed",
    left: 224,
    top: 92,
    zIndex: 10,
    display: "grid",
    gap: 4,
    maxWidth: 430,
    border: "1px solid rgba(119, 184, 255, 0.35)",
    borderRadius: 8,
    background: "rgba(5, 12, 25, 0.88)",
    color: "white",
    padding: "12px 14px",
    fontSize: 13,
  },
};

export default TerrenoDemoPage;
