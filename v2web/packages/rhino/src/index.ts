import type { RhinoAppManifest } from "@v2web/core";

export const builtinRhinoApps: RhinoAppManifest[] = [
  {
    id: "rhino.terrain-base.beta3",
    version: "0.1.0",
    label: "Terrain base beta3",
    description:
      "Legacy Grasshopper definition that creates the base terrain mesh and project JSON outputs.",
    definition: {
      id: "definition.beta3",
      label: "beta3.gh",
      filename: "beta3.gh",
      version: "legacy-current",
      storageUri: "legacy:src/components/rhinoCompute/io_req.json#Content.algo",
    },
    inputSchema: { schemaId: "rhino-beta3-input", version: "0.1.0" },
    outputSchema: { schemaId: "rhino-beta3-output", version: "0.1.0" },
    timeoutMs: 180000,
    cacheable: true,
    maxConcurrency: 1,
    requiredPlugins: ["Grasshopper", "Karamba3D"],
    legacyOutputMap: {
      lines: "lineas",
      mesh: "malla",
      hillsides: "laderas",
      soils: "suelos",
      matrix: "matriz",
      ARjson: "arJson",
      Genjson: "genJson",
      Lineasjson: "lineasJson",
      objectsjson: "objectsJson",
      lineasazulesjson: "lineasAzulesJson",
      lineasamarillasjson: "lineasAmarillasJson",
      listasjson: "listasJson",
    },
  },
];

export function getBuiltinRhinoApp(id: string) {
  return builtinRhinoApps.find((app) => app.id === id);
}

