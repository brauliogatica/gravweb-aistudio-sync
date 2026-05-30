import type {
  GrasshopperTerrainResult,
  ProcessingRequest,
  Project,
  RhinoRoundTripProbeResult,
} from "../types/types";
import { extractProjectUpdatesFromGrasshopper } from "./grasshopperProjectAdapter";

const RHINO_COMPUTE_URL =
  import.meta.env.VITE_RHINO_COMPUTE_URL?.trim().replace(/\/+$/, "") ?? "";
const RHINO_REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_RHINO_COMPUTE_TIMEOUT_MS ?? 90000
);
const RHINO_SOLVE_TIMEOUT_MS = Math.max(RHINO_REQUEST_TIMEOUT_MS, 180000);

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

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = RHINO_REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Rhino Compute no respondio dentro de ${Math.round(timeoutMs / 1000)} segundos.`
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
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
    const healthResponse = await fetchWithTimeout(`${RHINO_COMPUTE_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }, 7000);

    if (healthResponse.ok || healthResponse.status === 404) {
      return {
        available: true,
        status:
          healthResponse.status === 404
            ? "health-missing-404"
            : String(healthResponse.status),
        message:
          healthResponse.status === 404
            ? "Rhino Compute reachable; /health is not implemented."
            : "Rhino Compute available.",
      };
    }

    const rootResponse = await fetchWithTimeout(`${RHINO_COMPUTE_URL}/`, {
      method: "GET",
      headers: { Accept: "text/html, text/plain, */*" },
    }, 7000);

    return {
      available: rootResponse.ok,
      status: rootResponse.ok
        ? `root-${rootResponse.status}`
        : String(healthResponse.status),
      message: rootResponse.ok
        ? "Rhino Compute available at root endpoint."
        : healthResponse.statusText,
    };
  } catch (error) {
    try {
      const rootResponse = await fetchWithTimeout(`${RHINO_COMPUTE_URL}/`, {
        method: "GET",
        headers: { Accept: "text/html, text/plain, */*" },
      }, 7000);

      return {
        available: rootResponse.ok,
        status: rootResponse.ok ? `root-${rootResponse.status}` : "unreachable",
        message: rootResponse.ok
          ? "Rhino Compute available at root endpoint."
          : "Rhino Compute unreachable.",
      };
    } catch (rootError) {
      return {
        available: false,
        status: "unreachable",
        message:
          rootError instanceof Error
            ? rootError.message
            : error instanceof Error
              ? error.message
              : "Rhino Compute unreachable.",
      };
    }
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

  const response = await fetchWithTimeout(url, {
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

    const response = await fetchWithTimeout(`${RHINO_COMPUTE_URL}/io`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(ioContent),
      redirect: "follow",
    }, RHINO_SOLVE_TIMEOUT_MS);

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

  const definitionInfo = await fetchWithTimeout(`${RHINO_COMPUTE_URL}/io`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(ioContent),
    redirect: "follow",
  }, RHINO_SOLVE_TIMEOUT_MS);

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

  const response = await fetchWithTimeout(`${RHINO_COMPUTE_URL}/grasshopper`, {
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

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: getHeaders(),
    body,
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  return response.json();
}
