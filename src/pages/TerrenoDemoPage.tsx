import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import WaterParticle from "../components/waterParticles/WaterParticle";
import { RootState } from "../redux/store/store";
import { loadDemoProjectData } from "../services/demoProjectLoader";
import {
  checkLocalProcessorHealth,
  hasLocalProcessor,
} from "../services/localProcessorService";
import { loadProcessingRequest } from "../services/processingRequestService";
import type { LocalProcessorHealth, ProcessingRequest } from "../types/types";

const hasData = (value: unknown) => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 2;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

function TerrenoDemoPage() {
  const dispatch = useDispatch();
  const project = useSelector((state: RootState) => state.project);
  const [processingRequest, setProcessingRequest] =
    useState<ProcessingRequest | null>(null);
  const [localProcessorHealth, setLocalProcessorHealth] =
    useState<LocalProcessorHealth>({
      available: false,
      status: hasLocalProcessor() ? "checking" : "not-configured",
    });
  const [ready, setReady] = useState(
    hasData(project.genJson) && hasData(project.lineasJson)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProcessingRequest(loadProcessingRequest());

    let cancelled = false;
    checkLocalProcessorHealth().then((health) => {
      if (!cancelled) {
        setLocalProcessorHealth(health);
      }
    });

    if (hasData(project.genJson) && hasData(project.lineasJson)) {
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    loadDemoProjectData(dispatch)
      .then(() => setReady(true))
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar el terreno demo.");
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, project.genJson, project.lineasJson]);

  if (error) {
    return <div className="text-white p-4">{error}</div>;
  }

  if (!ready) {
    return <div className="text-white p-4">Cargando terreno demo...</div>;
  }

  return (
    <>
      <ProcessingRequestHud
        request={processingRequest}
        localProcessorHealth={localProcessorHealth}
      />
      <WaterParticle />
    </>
  );
}

const sourceLabels: Record<ProcessingRequest["source"], string> = {
  "manual-polygon": "Polígono manual",
  "demo-polygon": "Polígono demo",
  "imported-file": "Archivo importado",
};

function ProcessingRequestHud({
  request,
  localProcessorHealth,
}: {
  request: ProcessingRequest | null;
  localProcessorHealth: LocalProcessorHealth;
}) {
  const localProcessorConfigured = hasLocalProcessor();
  const shouldWarn =
    request &&
    request.source !== "demo-polygon" &&
    !localProcessorHealth.available;

  const processorLabel = !localProcessorConfigured
    ? "No configurado"
    : localProcessorHealth.available
      ? "Disponible"
      : localProcessorHealth.status === "checking"
        ? "Verificando"
        : "No disponible";

  return (
    <aside
      style={{
        position: "fixed",
        top: 86,
        left: 222,
        zIndex: 20,
        maxWidth: 390,
        border: "1px solid rgba(125, 211, 252, 0.28)",
        borderRadius: 8,
        background: "rgba(6, 11, 25, 0.82)",
        color: "#f8fafc",
        padding: "12px 14px",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
        fontSize: 13,
        lineHeight: 1.45,
        backdropFilter: "blur(8px)",
      }}
    >
      <strong style={{ display: "block", marginBottom: 6 }}>
        Solicitud de procesamiento
      </strong>
      {request ? (
        <>
          <div>ID: {request.id}</div>
          <div>Origen: {sourceLabels[request.source]}</div>
          <div>Estado: {request.status}</div>
          <div>Puntos: {request.polygon.length}</div>
          <div>Procesador local: {processorLabel}</div>
          {typeof request.areaM2 === "number" && (
            <div>Área: {(request.areaM2 / 10000).toFixed(2)} ha</div>
          )}
          {shouldWarn && (
            <div style={{ marginTop: 8, color: "#fde68a" }}>
              Procesador local no detectado. Cargando terreno demo por defecto.
            </div>
          )}
        </>
      ) : (
        <>
          <div>Procesador local: {processorLabel}</div>
          <div>Sin solicitud activa. Cargando terreno demo por defecto.</div>
        </>
      )}
    </aside>
  );
}

export default TerrenoDemoPage;
