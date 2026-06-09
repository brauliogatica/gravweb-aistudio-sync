import type { RepresentationManifest } from "@v2web/core";

export const builtinRepresentationManifests: RepresentationManifest[] = [
  {
    id: "representation.project.summary-report",
    version: "0.1.0",
    label: "Project summary report",
    description: "Markdown report generated from project facts and artifacts.",
    renderer: "markdown-report",
    inputSchema: { schemaId: "project-summary-query", version: "0.1.0" },
    viewSpecSchema: { schemaId: "markdown-report-view", version: "0.1.0" },
    allowedActions: ["project.open", "artifact.download"],
  },
  {
    id: "representation.analysis.scalar-chart",
    version: "0.1.0",
    label: "Analysis scalar chart",
    description: "Chart view for scalar terrain analysis artifacts.",
    renderer: "echarts-chart",
    inputSchema: { schemaId: "analysis-scalar-query", version: "0.1.0" },
    viewSpecSchema: { schemaId: "echarts-view", version: "0.1.0" },
    allowedActions: ["layer.activate", "artifact.inspect"],
  },
  {
    id: "representation.terrain.tooltip",
    version: "0.1.0",
    label: "Terrain tooltip",
    description: "Contextual tooltip for selected mesh points and features.",
    renderer: "terrain-tooltip",
    inputSchema: { schemaId: "terrain-tooltip-query", version: "0.1.0" },
    viewSpecSchema: { schemaId: "terrain-tooltip-view", version: "0.1.0" },
    allowedActions: ["feature.select", "tool.run"],
  },
];

export function getBuiltinRepresentationManifest(id: string) {
  return builtinRepresentationManifests.find((item) => item.id === id);
}

