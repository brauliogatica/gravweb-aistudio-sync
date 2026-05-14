const RHINO_COMPUTE_URL =
  import.meta.env.VITE_RHINO_COMPUTE_URL?.trim().replace(/\/+$/, "") ?? "";
const RHINO_COMPUTE_KEY = import.meta.env.VITE_RHINO_COMPUTE_KEY?.trim() ?? "";

export interface GrasshopperRequest {
  definition: string;
  inputs: Record<string, any>;
}

const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "ngrok-skip",
};

function getHeaders(extraHeaders?: Record<string, string>) {
  if (RHINO_COMPUTE_KEY) {
    baseHeaders.RhinoComputeKey = RHINO_COMPUTE_KEY;
  }

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
