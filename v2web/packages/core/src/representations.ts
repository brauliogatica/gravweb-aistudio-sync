import type { JsonObject, JsonSchemaRef } from "./json";
import type { EntityId } from "./identity";

export type RepresentationRenderer =
  | "markdown-report"
  | "echarts-chart"
  | "data-table"
  | "terrain-tooltip"
  | "three-annotation"
  | "dashboard-panel";

export interface RepresentationManifest {
  id: EntityId;
  version: string;
  label: string;
  description: string;
  renderer: RepresentationRenderer;
  inputSchema: JsonSchemaRef;
  dataQuery?: JsonObject;
  viewSpecSchema?: JsonSchemaRef;
  allowedActions: string[];
  generatedBy?: {
    provider: "human" | "llm" | "system";
    promptArtifactId?: EntityId;
    model?: string;
  };
}

