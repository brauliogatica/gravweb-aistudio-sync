import type { TerrainAnalysisLayerManifest } from "../types/types";

const API_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export interface ProcessAnalysisLayerPayload {
  processingRequestId?: string;
  meshSummary?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

function getApiUrl() {
  if (!API_URL) {
    throw new Error("VITE_API_BASE_URL no esta configurado.");
  }

  return API_URL;
}

export async function processProjectAnalysisLayer(
  projectId: string,
  layerId: string,
  payload: ProcessAnalysisLayerPayload
): Promise<TerrainAnalysisLayerManifest> {
  const response = await fetch(
    `${getApiUrl()}/project/${encodeURIComponent(
      projectId
    )}/analysis-layers/${encodeURIComponent(layerId)}/process`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Backend de analisis respondio ${response.status}. ${text.slice(0, 240)}`
    );
  }

  const data = await response.json();
  return data.manifest ?? data;
}

export async function getProjectAnalysisLayers(
  projectId: string
): Promise<Record<string, TerrainAnalysisLayerManifest>> {
  const response = await fetch(
    `${getApiUrl()}/project/${encodeURIComponent(projectId)}/analysis-layers`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudieron cargar las capas: ${response.status}.`);
  }

  return response.json();
}
