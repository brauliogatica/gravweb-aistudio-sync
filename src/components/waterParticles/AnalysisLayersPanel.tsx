import React, { useMemo, useState } from "react";
import type { TerrainAnalysisLayerManifest } from "../../types/types";
import {
  terrainAnalysisFolders,
  terrainAnalysisLayers,
  type TerrainAnalysisLayerDefinition,
} from "./analysisLayerRegistry";

export interface AnalysisLayerUiState {
  status: TerrainAnalysisLayerManifest["status"];
  message?: string;
  manifest?: TerrainAnalysisLayerManifest;
}

interface AnalysisLayersPanelProps {
  activeLayerId?: string;
  layerStates: Record<string, AnalysisLayerUiState | undefined>;
  onActivateLayer: (layer: TerrainAnalysisLayerDefinition) => void;
  onProcessLayer: (layer: TerrainAnalysisLayerDefinition) => void;
}

const defaultOpenFolders = terrainAnalysisFolders.reduce<Record<string, boolean>>(
  (result, folder) => {
    result[folder.id] = true;
    return result;
  },
  {}
);

function statusLabel(layer: TerrainAnalysisLayerDefinition, state?: AnalysisLayerUiState) {
  if (state?.status === "processing") return "Procesando";
  if (state?.status === "failed") return "Error";
  if (state?.status === "ready" && state.manifest?.source === "backend") return "Listo";
  if (state?.status === "ready" && state.manifest?.source === "backend-stub") return "Preview";
  if (state?.status === "ready") return "Listo";
  if (layer.computeMode === "mesh") return "Malla";
  if (!state || state.status === "idle") return "Backend";
  return state.status;
}

export default function AnalysisLayersPanel({
  activeLayerId,
  layerStates,
  onActivateLayer,
  onProcessLayer,
}: AnalysisLayersPanelProps) {
  const [openFolders, setOpenFolders] = useState(defaultOpenFolders);

  const layersByFolder = useMemo(() => {
    return terrainAnalysisFolders.map((folder) => ({
      ...folder,
      layers: terrainAnalysisLayers.filter((layer) => layer.folderId === folder.id),
    }));
  }, []);

  return (
    <details id="analysis-layer-manager" aria-label="Capas de analisis" open>
      <summary className="analysis-layer-header">
        <span>Capas de analisis</span>
        <strong>{terrainAnalysisLayers.length}</strong>
      </summary>

      <div className="analysis-layer-tree">
        {layersByFolder.map((folder) => {
          const isOpen = openFolders[folder.id];

          return (
            <section className="analysis-folder" key={folder.id}>
              <button
                className="analysis-folder-toggle"
                type="button"
                onClick={() =>
                  setOpenFolders((current) => ({
                    ...current,
                    [folder.id]: !current[folder.id],
                  }))
                }
              >
                <span>{folder.label}</span>
                <span>{isOpen ? "-" : "+"}</span>
              </button>

              {isOpen && (
                <div className="analysis-folder-items">
                  {folder.layers.map((layer) => {
                    const state = layerStates[layer.id];
                    const isActive = activeLayerId === layer.id;
                    const canActivate =
                      layer.computeMode === "mesh" || state?.status === "ready";
                    const isProcessing = state?.status === "processing";
                    const statusClass =
                      state?.status === "ready" && state.manifest?.source === "backend-stub"
                        ? "preview"
                        : state?.status ?? "idle";

                    return (
                      <div
                        className={`analysis-layer-item ${
                          isActive ? "active" : ""
                        }`}
                        key={layer.id}
                      >
                        <button
                          className="analysis-layer-main"
                          type="button"
                          disabled={!canActivate}
                          title={layer.description}
                          onClick={() => onActivateLayer(layer)}
                        >
                          <span className="analysis-layer-index">
                            {String(layer.index).padStart(2, "0")}
                          </span>
                          <span className="analysis-layer-label">{layer.label}</span>
                        </button>

                        <div className="analysis-layer-actions">
                          <span
                            className={`analysis-layer-status status-${statusClass}`}
                          >
                            {statusLabel(layer, state)}
                          </span>
                          <button
                            className="analysis-layer-process"
                            type="button"
                            disabled={isProcessing}
                            onClick={() => onProcessLayer(layer)}
                          >
                            {isProcessing
                              ? "..."
                              : state?.manifest?.source === "backend-stub"
                              ? "Preview"
                              : state?.manifest?.source === "backend"
                              ? "Reprocesar"
                              : "Procesar"}
                          </button>
                        </div>
                        {state?.message && (
                          <p className="analysis-layer-message">{state.message}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </details>
  );
}
