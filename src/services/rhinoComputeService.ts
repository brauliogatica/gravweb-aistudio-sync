import type {
  ProcessingRequest,
  RhinoRoundTripProbeResult,
} from "../types/types";

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

function summarizeProcessingRequest(request?: ProcessingRequest | null) {
  if (!request) return undefined;

  return {
    id: request.id,
    source: request.source,
    pointCount: request.polygon.length,
    areaM2: request.areaM2,
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
