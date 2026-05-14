import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import WaterParticle from "../components/waterParticles/WaterParticle";
import { RootState } from "../redux/store/store";
import { updateProject } from "../redux/slices/projectSlice";
import { loadDemoProjectData } from "../services/demoProjectLoader";
import { loadProcessingRequest } from "../services/processingRequestService";
import {
  checkRhinoComputeHealth,
  getRhinoComputeUrl,
  probeRhinoComputeRoundTrip,
  solveTerrainWithGrasshopper,
} from "../services/rhinoComputeService";
import type {
  GrasshopperTerrainResult,
  LocalProcessorHealth,
  ProcessingRequest,
  RhinoRoundTripProbeResult,
} from "../types/types";

const hasData = (value: unknown) => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 2;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

type ProbeState =
  | { status: "idle"; result?: undefined; error?: undefined }
  | { status: "running"; result?: undefined; error?: undefined }
  | { status: "success"; result: RhinoRoundTripProbeResult; error?: undefined }
  | { status: "error"; result?: RhinoRoundTripProbeResult; error: string };

type GrasshopperState =
  | { status: "idle"; result?: undefined; error?: undefined }
  | { status: "running"; result?: undefined; error?: undefined }
  | { status: "success"; result: GrasshopperTerrainResult; error?: undefined }
  | { status: "error"; result?: undefined; error: string };

function TerrenoDemoPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const project = useSelector((state: RootState) => state.project);
  const [processingRequest, setProcessingRequest] =
    useState<ProcessingRequest | null>(null);
  const [rhinoHealth, setRhinoHealth] = useState<LocalProcessorHealth>({
    available: false,
    status: getRhinoComputeUrl() ? "checking" : "not-configured",
  });
  const [ready, setReady] = useState(
    hasData(project.genJson) && hasData(project.lineasJson)
  );
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [probeState, setProbeState] = useState<ProbeState>({ status: "idle" });
  const [grasshopperState, setGrasshopperState] = useState<GrasshopperState>({
    status: "idle",
  });

  useEffect(() => {
    setProcessingRequest(loadProcessingRequest());

    let cancelled = false;
    checkRhinoComputeHealth().then((health) => {
      if (!cancelled) {
        console.info("Estado de Rhino Compute:", health);
        setRhinoHealth(health);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasData(project.genJson) && hasData(project.lineasJson)) {
      setReady(true);
    }
  }, [project.genJson, project.lineasJson]);

  const handleLoadDemo = async () => {
    setDemoError(null);
    setLoadingDemo(true);

    try {
      await loadDemoProjectData(dispatch);
      setReady(true);
    } catch (loadError) {
      console.error(loadError);
      setDemoError("No se pudo cargar el terreno demo.");
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleProbeRhino = async () => {
    console.info("Gravweb: probando ida-vuelta Rhino", processingRequest);
    setProbeState({ status: "running" });

    const result = await probeRhinoComputeRoundTrip(processingRequest);
    console.info("Gravweb: resultado ida-vuelta Rhino", result);

    if (result.ok) {
      setProbeState({ status: "success", result });
      return;
    }

    setProbeState({
      status: "error",
      result,
      error: result.message,
    });
  };

  const handleProcessGrasshopper = async () => {
    if (!processingRequest) {
      setGrasshopperState({
        status: "error",
        error: "No hay solicitud de terreno para procesar.",
      });
      return;
    }

    console.info("Gravweb: procesando terreno con Grasshopper", processingRequest);
    setGrasshopperState({ status: "running" });

    try {
      const { result, updates } = await solveTerrainWithGrasshopper(
        processingRequest,
        project
      );

      for (const [key, value] of Object.entries(updates)) {
        dispatch(updateProject({ key, value }));
      }

      dispatch(updateProject({ key: "coordinates", value: processingRequest.polygon }));
      if (processingRequest.centroid) {
        dispatch(
          updateProject({
            key: "coordinatesCenter",
            value: processingRequest.centroid,
          })
        );
      }
      if (typeof processingRequest.areaM2 === "number") {
        dispatch(
          updateProject({
            key: "areaTerrenoM2",
            value: processingRequest.areaM2,
          })
        );
      }

      setGrasshopperState({ status: "success", result });
      setReady(true);
      console.info("Gravweb: terreno Rhino aplicado a Redux", result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo procesar el terreno con Grasshopper.";
      console.error(error);
      setGrasshopperState({ status: "error", error: message });
    }
  };

  return (
    <>
      <ProcessingRequestHud
        request={processingRequest}
        rhinoHealth={rhinoHealth}
        demoLoaded={ready}
        loadingDemo={loadingDemo}
        demoError={demoError}
        probeState={probeState}
        grasshopperState={grasshopperState}
        onLoadDemo={handleLoadDemo}
        onProbeRhino={handleProbeRhino}
        onProcessGrasshopper={handleProcessGrasshopper}
        onBackToAnalysis={() => navigate("/analisis")}
      />
      {ready ? (
        <WaterParticle />
      ) : (
        <NoTerrainLoaded
          request={processingRequest}
          loadingDemo={loadingDemo}
          demoError={demoError}
          probeState={probeState}
          grasshopperState={grasshopperState}
          onLoadDemo={handleLoadDemo}
          onProbeRhino={handleProbeRhino}
          onProcessGrasshopper={handleProcessGrasshopper}
          onBackToAnalysis={() => navigate("/analisis")}
        />
      )}
    </>
  );
}

const sourceLabels: Record<ProcessingRequest["source"], string> = {
  "manual-polygon": "Poligono manual",
  "demo-polygon": "Poligono demo",
  "imported-file": "Archivo importado",
};

function ProcessingRequestHud({
  request,
  rhinoHealth,
  demoLoaded,
  loadingDemo,
  demoError,
  probeState,
  grasshopperState,
  onLoadDemo,
  onProbeRhino,
  onProcessGrasshopper,
  onBackToAnalysis,
}: {
  request: ProcessingRequest | null;
  rhinoHealth: LocalProcessorHealth;
  demoLoaded: boolean;
  loadingDemo: boolean;
  demoError: string | null;
  probeState: ProbeState;
  grasshopperState: GrasshopperState;
  onLoadDemo: () => void;
  onProbeRhino: () => void;
  onProcessGrasshopper: () => void;
  onBackToAnalysis: () => void;
}) {
  const rhinoConfigured = Boolean(getRhinoComputeUrl());
  const processorLabel = !rhinoConfigured
    ? "No configurado"
    : rhinoHealth.available
      ? "Disponible"
      : rhinoHealth.status === "checking"
        ? "Verificando"
        : "No disponible";

  return (
    <aside
      style={{
        position: "fixed",
        top: 86,
        left: 222,
        zIndex: 20,
        maxWidth: 430,
        border: "1px solid rgba(125, 211, 252, 0.28)",
        borderRadius: 8,
        background: "rgba(6, 11, 25, 0.86)",
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
          {typeof request.areaM2 === "number" && (
            <div>Area: {(request.areaM2 / 10000).toFixed(2)} ha</div>
          )}
        </>
      ) : (
        <div>Sin solicitud activa.</div>
      )}
      <div>Rhino Compute: {processorLabel}</div>
      <div>Terreno demo: {demoLoaded ? "Cargado" : "Disponible con boton"}</div>
      {!demoLoaded && request && (
        <div style={{ marginTop: 8, color: "#fde68a" }}>
          Hay solicitud en memoria, pero aun no hay malla procesada. Puedes
          probar el ida-vuelta a Rhino o cargar el demo.
        </div>
      )}
      <ProbeStatus probeState={probeState} compact />
      <GrasshopperStatus grasshopperState={grasshopperState} compact />
      {demoError && <div style={{ color: "#fecaca" }}>{demoError}</div>}
      <ActionButtons
        rhinoConfigured={rhinoConfigured}
        hasRequest={Boolean(request)}
        loadingDemo={loadingDemo}
        demoLoaded={demoLoaded}
        probeState={probeState}
        grasshopperState={grasshopperState}
        onLoadDemo={onLoadDemo}
        onProbeRhino={onProbeRhino}
        onProcessGrasshopper={onProcessGrasshopper}
        onBackToAnalysis={onBackToAnalysis}
      />
    </aside>
  );
}

function NoTerrainLoaded({
  request,
  loadingDemo,
  demoError,
  probeState,
  grasshopperState,
  onLoadDemo,
  onProbeRhino,
  onProcessGrasshopper,
  onBackToAnalysis,
}: {
  request: ProcessingRequest | null;
  loadingDemo: boolean;
  demoError: string | null;
  probeState: ProbeState;
  grasshopperState: GrasshopperState;
  onLoadDemo: () => void;
  onProbeRhino: () => void;
  onProcessGrasshopper: () => void;
  onBackToAnalysis: () => void;
}) {
  const rhinoConfigured = Boolean(getRhinoComputeUrl());

  return (
    <main
      style={{
        minHeight: "calc(100vh - 70px)",
        display: "grid",
        placeItems: "center",
        background: "#0f172a",
        color: "#f8fafc",
        padding: "120px 24px 48px",
      }}
    >
      <section
        style={{
          width: "min(760px, 100%)",
          border: "1px solid rgba(125, 211, 252, 0.24)",
          borderRadius: 8,
          background: "rgba(15, 23, 42, 0.88)",
          padding: 24,
          boxShadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>
          Terreno demo listo para pruebas
        </h2>
        <p style={{ marginTop: 0, color: "#cbd5e1" }}>
          La pantalla mantiene el demo disponible, pero no lo carga
          automaticamente cuando vienes desde un poligono. Asi podemos probar
          primero si AI Studio envia al PC por Cloudflare y si Rhino responde.
        </p>
        {request ? (
          <div style={{ marginBottom: 14 }}>
            <strong>Solicitud activa:</strong> {sourceLabels[request.source]} -{" "}
            {request.polygon.length} puntos
            {typeof request.areaM2 === "number" &&
              ` - ${(request.areaM2 / 10000).toFixed(2)} ha`}
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>No hay solicitud activa.</div>
        )}
        <ProbeStatus probeState={probeState} />
        <GrasshopperStatus grasshopperState={grasshopperState} />
        {demoError && (
          <div style={{ color: "#fecaca", marginBottom: 12 }}>{demoError}</div>
        )}
        <ActionButtons
          rhinoConfigured={rhinoConfigured}
          hasRequest={Boolean(request)}
          loadingDemo={loadingDemo}
          demoLoaded={false}
          probeState={probeState}
          grasshopperState={grasshopperState}
          onLoadDemo={onLoadDemo}
          onProbeRhino={onProbeRhino}
          onProcessGrasshopper={onProcessGrasshopper}
          onBackToAnalysis={onBackToAnalysis}
        />
      </section>
    </main>
  );
}

function ActionButtons({
  rhinoConfigured,
  hasRequest,
  loadingDemo,
  demoLoaded,
  probeState,
  grasshopperState,
  onLoadDemo,
  onProbeRhino,
  onProcessGrasshopper,
  onBackToAnalysis,
}: {
  rhinoConfigured: boolean;
  hasRequest: boolean;
  loadingDemo: boolean;
  demoLoaded: boolean;
  probeState: ProbeState;
  grasshopperState: GrasshopperState;
  onLoadDemo: () => void;
  onProbeRhino: () => void;
  onProcessGrasshopper: () => void;
  onBackToAnalysis: () => void;
}) {
  const isProbing = probeState.status === "running";
  const isProcessing = grasshopperState.status === "running";

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
      <button
        type="button"
        onClick={onProcessGrasshopper}
        disabled={!rhinoConfigured || !hasRequest || isProcessing}
        style={buttonStyle(!rhinoConfigured || !hasRequest || isProcessing)}
      >
        {isProcessing ? "Procesando..." : "Procesar con Grasshopper"}
      </button>
      <button
        type="button"
        onClick={onProbeRhino}
        disabled={!rhinoConfigured || isProbing}
        style={buttonStyle(!rhinoConfigured || isProbing)}
      >
        {isProbing ? "Probando Rhino..." : "Probar ida-vuelta Rhino"}
      </button>
      <button
        type="button"
        onClick={onLoadDemo}
        disabled={loadingDemo}
        style={buttonStyle(loadingDemo)}
      >
        {loadingDemo
          ? "Cargando demo..."
          : demoLoaded
            ? "Recargar terreno demo"
            : "Cargar terreno demo"}
      </button>
      <button type="button" onClick={onBackToAnalysis} style={secondaryButton}>
        Volver a analisis
      </button>
    </div>
  );
}

function ProbeStatus({
  probeState,
  compact = false,
}: {
  probeState: ProbeState;
  compact?: boolean;
}) {
  if (probeState.status === "idle") return null;

  if (probeState.status === "running") {
    return (
      <div style={{ marginTop: compact ? 8 : 0, color: "#bfdbfe" }}>
        Enviando prueba a Rhino Compute...
      </div>
    );
  }

  const result = probeState.result;
  const color = probeState.status === "success" ? "#bbf7d0" : "#fecaca";

  return (
    <div style={{ marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 12 }}>
      <div style={{ color }}>
        {probeState.status === "success" ? "OK" : "Error"}:{" "}
        {result?.message ?? probeState.error}
      </div>
      {result && (
        <div style={{ color: "#cbd5e1" }}>
          {result.endpoint} - HTTP {result.status} - {result.durationMs} ms
          {typeof result.responseBytes === "number" &&
            ` - ${result.responseBytes} bytes`}
        </div>
      )}
    </div>
  );
}

function GrasshopperStatus({
  grasshopperState,
  compact = false,
}: {
  grasshopperState: GrasshopperState;
  compact?: boolean;
}) {
  if (grasshopperState.status === "idle") return null;

  if (grasshopperState.status === "running") {
    return (
      <div style={{ marginTop: compact ? 8 : 0, color: "#bfdbfe" }}>
        Procesando terreno con Grasshopper...
      </div>
    );
  }

  if (grasshopperState.status === "error") {
    return (
      <div
        style={{
          marginTop: compact ? 8 : 0,
          marginBottom: compact ? 0 : 12,
          color: "#fecaca",
        }}
      >
        Error: {grasshopperState.error}
      </div>
    );
  }

  return (
    <div style={{ marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 12 }}>
      <div style={{ color: "#bbf7d0" }}>{grasshopperState.result.message}</div>
      <div style={{ color: "#cbd5e1" }}>
        HTTP {grasshopperState.result.status} -{" "}
        {grasshopperState.result.durationMs} ms -{" "}
        {grasshopperState.result.updatedKeys.length} campos aplicados
      </div>
    </div>
  );
}

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(125, 211, 252, 0.28)",
    borderRadius: 6,
    background: disabled ? "rgba(71, 85, 105, 0.65)" : "#0ea5e9",
    color: "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    padding: "8px 10px",
  };
}

const secondaryButton: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 6,
  background: "rgba(15, 23, 42, 0.8)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  padding: "8px 10px",
};

export default TerrenoDemoPage;
