import type {
  GrasshopperTerrainResult,
  ProcessingRequest,
  Project,
  RhinoRoundTripProbeResult,
} from "../types/types";
import { extractProjectUpdatesFromGrasshopper } from "./grasshopperProjectAdapter";

const RHINO_COMPUTE_URL =
  import.meta.env.VITE_RHINO_COMPUTE_URL?.trim().replace(/\/+$/, "") ?? "";

export interface GrasshopperRequest {
  definition: string;
  inputs: Record<string, any>;
}

const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json, text/plain, */*",
  "ngrok-skip-browser-warning": "ngrok-skip",
};

function getHeaders(extraHeaders?: Record<string, string>) {
  return { ...baseHeaders, ...extraHeaders };
}

export function getRhinoComputeUrl() {
  return RHINO_COMPUTE_URL;
}

export async function checkRhinoComputeHealth() {
  if (!RHINO_COMPUTE_URL) {
    return {
      available: false,
      status: "not-configured",
      message: "Rhino Compute URL is not configured.",
    };
  }

  try {
    const response = await fetch(`${RHINO_COMPUTE_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    return {
      available: response.ok,
      status: String(response.status),
      message: response.ok ? "Rhino Compute available." : response.statusText,
    };
  } catch (error) {
    return {
      available: false,
      status: "unreachable",
      message:
        error instanceof Error ? error.message : "Rhino Compute unreachable.",
    };
  }
}

export async function getRhinoIo(
  definition: string,
  inputs: Record<string, any>
) {
  if (!RHINO_COMPUTE_URL) {
    throw new Error("VITE_RHINO_COMPUTE_URL no esta configurado.");
  }

  const url = `${RHINO_COMPUTE_URL}/io`;
  const body = JSON.stringify({ definition, inputs });

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  return response.json();
}

export async function probeRhinoComputeRoundTrip(
  request?: ProcessingRequest | null
): Promise<RhinoRoundTripProbeResult> {
  if (!RHINO_COMPUTE_URL) {
    return {
      ok: false,
      endpoint: "/io",
      status: "not-configured",
      durationMs: 0,
      message: "VITE_RHINO_COMPUTE_URL no esta configurado.",
      requestSummary: summarizeProcessingRequest(request),
    };
  }

  const startedAt = performance.now();

  try {
    const ioModule = await import("../components/rhinoCompute/io_req.json");
    const ioRequest = (ioModule as any).default ?? ioModule;
    const ioContent = ioRequest.Content ?? ioRequest;

    const response = await fetch(`${RHINO_COMPUTE_URL}/io`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(ioContent),
      redirect: "follow",
    });

    const text = await response.text();
    const durationMs = Math.round(performance.now() - startedAt);

    return {
      ok: response.ok,
      endpoint: "/io",
      status: String(response.status),
      durationMs,
      message: response.ok
        ? "Ida-vuelta con Rhino Compute confirmada."
        : `Rhino Compute respondio con ${response.status}.`,
      responseBytes: text.length,
      responsePreview: text.slice(0, 500),
      requestSummary: summarizeProcessingRequest(request),
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: "/io",
      status: "unreachable",
      durationMs: Math.round(performance.now() - startedAt),
      message:
        error instanceof Error
          ? error.message
          : "No se pudo completar la ida-vuelta con Rhino Compute.",
      requestSummary: summarizeProcessingRequest(request),
    };
  }
}

export async function solveTerrainWithGrasshopper(
  request: ProcessingRequest,
  project: Project
): Promise<{
  result: GrasshopperTerrainResult;
  updates: Record<string, unknown>;
}> {
  if (!RHINO_COMPUTE_URL) {
    throw new Error("VITE_RHINO_COMPUTE_URL no esta configurado.");
  }

  const startedAt = performance.now();
  const ioModule = await import("../components/rhinoCompute/io_req.json");
  const ioRequest = (ioModule as any).default ?? ioModule;
  const ioContent = ioRequest.Content ?? ioRequest;

  const definitionInfo = await fetch(`${RHINO_COMPUTE_URL}/io`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(ioContent),
    redirect: "follow",
  });

  if (!definitionInfo.ok) {
    throw new Error(`Rhino /io respondio con ${definitionInfo.status}.`);
  }

  const definition = await definitionInfo.json();
  const solveBody = buildLegacySolveBody(
    ioContent,
    definition.CacheKey ?? ioContent.pointer,
    request,
    project
  );

  const response = await fetch(`${RHINO_COMPUTE_URL}/grasshopper`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(solveBody),
    redirect: "follow",
  });

  const responseText = await response.text();
  const durationMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    throw new Error(
      `Rhino /grasshopper respondio con ${response.status}. ${responseText.slice(
        0,
        500
      )}`
    );
  }

  const grasshopperResponse = JSON.parse(responseText);
  const updates = extractProjectUpdatesFromGrasshopper(grasshopperResponse);
  const updatedKeys = Object.keys(updates);

  return {
    result: {
      ok: true,
      status: String(response.status),
      durationMs,
      message: "Terreno procesado por Grasshopper.",
      updatedKeys,
      responseBytes: responseText.length,
      warnings: grasshopperResponse.warnings,
      errors: grasshopperResponse.errors,
    },
    updates,
  };
}

function summarizeProcessingRequest(request?: ProcessingRequest | null) {
  if (!request) return undefined;

  return {
    id: request.id,
    source: request.source,
    pointCount: request.polygon.length,
    areaM2: request.areaM2,
  };
}

function buildLegacySolveBody(
  ioContent: any,
  pointer: string,
  request: ProcessingRequest,
  project: Project
) {
  const coordinates = closeTerrainPolygon(request.polygon);
  const coordinatesCenter =
    request.centroid ?? project.coordinatesCenter ?? coordinates[0];

  return {
    absolutetolerance: ioContent.absolutetolerance ?? 0.01,
    angletolerance: ioContent.angletolerance ?? 1.0,
    modelunits: ioContent.modelunits ?? "Meters",
    dataversion: ioContent.dataversion ?? 8,
    algo: null,
    pointer,
    cachesolve: true,
    values: [
      ghString("projectId", "1"),
      ghString("projectName", "1"),
      ghString("projectDescription", "1"),
      ghString("userId", "1"),
      ghJsonString("coordinatesCenter", coordinatesCenter),
      ghJsonString("coordinates", coordinates),
      ghString("uso", "Bosque"),
      ghString("tipo", "Suelo arcilloso"),
      ghString("humedad", "Moderado"),
      ghString("infiltracion", "arcilla arenosa"),
      ghString("almacenamiento", "limo"),
      ghBoolean("Segmentacion", true),
      ghBoolean("Dise\u00f1o", true),
      ghBoolean("DatosXR", true),
    ],
    warnings: [],
    errors: [],
  };
}

function closeTerrainPolygon(points: ProcessingRequest["polygon"]) {
  const coordinates = points
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng)
    )
    .map((point) => ({ lat: point.lat, lng: point.lng }));

  if (coordinates.length < 3) {
    throw new Error("El poligono necesita al menos 3 puntos validos.");
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const isClosed =
    Math.abs(first.lat - last.lat) < 0.0000001 &&
    Math.abs(first.lng - last.lng) < 0.0000001;

  if (!isClosed) {
    coordinates.push({ ...first });
  }

  return coordinates;
}

function ghString(paramName: string, value: string) {
  return {
    ParamName: paramName,
    InnerTree: {
      "{0}": [
        {
          type: "System.String",
          data: JSON.stringify(value),
        },
      ],
    },
  };
}

function ghJsonString(paramName: string, value: unknown) {
  return ghString(paramName, JSON.stringify(value, null, 2));
}

function ghBoolean(paramName: string, value: boolean) {
  return {
    ParamName: paramName,
    InnerTree: {
      "{0}": [
        {
          type: "System.Boolean",
          data: value ? "true" : "false",
        },
      ],
    },
  };
}

export async function solveGrasshopper(
  definition: string,
  inputs: Record<string, any>
) {
  if (!RHINO_COMPUTE_URL) {
    throw new Error("VITE_RHINO_COMPUTE_URL no esta configurado.");
  }

  const url = `${RHINO_COMPUTE_URL}/grasshopper`;
  const body = JSON.stringify({ definition, inputs });

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body,
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  return response.json();
}
