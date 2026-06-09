import type { ToolManifest } from "@v2web/core";

export const builtinToolManifests: ToolManifest[] = [
  {
    id: "terrain.selection.polygon-editor",
    version: "0.1.0",
    label: "Polygon editor",
    description: "Create and edit terrain polygons on the map or 3D mesh.",
    family: "frontend",
    stage: "selection",
    realtime: true,
    requiresProject: false,
    requiresMesh: false,
    inputSchema: { schemaId: "terrain-feature-polygon-input", version: "0.1.0" },
    outputSchema: { schemaId: "terrain-feature-polygon-output", version: "0.1.0" },
    componentId: "PolygonEditorPanel",
    rendererId: "terrain-feature-overlay",
    permissions: [],
    sideEffects: [{ target: "scene", description: "Adds or updates polygon features." }],
  },
  {
    id: "terrain.interaction.point-marker",
    version: "0.1.0",
    label: "Point marker",
    description: "Mark functional points over the terrain mesh.",
    family: "frontend",
    stage: "editing",
    realtime: true,
    requiresProject: true,
    requiresMesh: true,
    inputSchema: { schemaId: "terrain-point-feature-input", version: "0.1.0" },
    outputSchema: { schemaId: "terrain-point-feature-output", version: "0.1.0" },
    componentId: "PointMarkerPanel",
    rendererId: "terrain-feature-overlay",
    permissions: [],
    sideEffects: [{ target: "scene", description: "Adds or updates point features." }],
  },
  {
    id: "terrain.analysis.drainage",
    version: "0.1.0",
    label: "Drainage analysis",
    description: "Requests a backend drainage artifact for the active terrain mesh.",
    family: "backend",
    stage: "analysis",
    realtime: false,
    requiresProject: true,
    requiresMesh: true,
    inputSchema: { schemaId: "analysis-layer-process-input", version: "0.1.0" },
    outputSchema: { schemaId: "analysis-layer-artifact-output", version: "0.1.0" },
    componentId: "AnalysisLayerPanel",
    rendererId: "mesh-scalar-layer",
    jobKind: "analysis-layer",
    permissions: [
      {
        id: "project.artifact.write",
        description: "Store analysis artifacts for the active project.",
        required: true,
      },
    ],
    sideEffects: [{ target: "artifact-store", description: "Creates compressed analysis artifact." }],
  },
];

export function getBuiltinToolManifest(id: string) {
  return builtinToolManifests.find((tool) => tool.id === id);
}

