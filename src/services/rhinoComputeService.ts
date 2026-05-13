const RHINO_COMPUTE_URL = process.env.REACT_APP_RHINO_COMPUTE_URL;
const RHINO_COMPUTE_KEY = process.env.REACT_APP_RHINO_COMPUTE_KEY;

export interface GrasshopperRequest {
  definition: string;
  inputs: Record<string, any>;
}

const baseHeaders = {
  "Content-Type": "application/json",
  RhinoComputeKey: RHINO_COMPUTE_KEY as string,
  "ngrok-skip-browser-warning": "ngrok-skip",
};

// Función para combinar headers base con headers específicos
function getHeaders(extraHeaders?: Record<string, string>) {
  return { ...baseHeaders, ...extraHeaders };
}

export async function getRhinoIo(
  definition: string,
  inputs: Record<string, any>
) {
  const url = `${RHINO_COMPUTE_URL}/io`;
  const body = JSON.stringify({ definition, inputs });

  const requestOptions: RequestInit = {
    method: "POST",
    headers: getHeaders(),
    body,
    redirect: "follow",
  };

  let result1 = "";
  try {
    await fetch(url, requestOptions)
      .then((response) => response.json())
      .then((result) => (result1 = JSON.stringify(result)));
  } catch (error) {
    console.error("Error al cargar entradas y salidas:", error);
  }
}

export async function solveGrasshopper(
  definition: string,
  inputs: Record<string, any>
) {
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
