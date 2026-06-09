import type { JsonObject, JsonSchemaRef } from "./json";
import type { EntityId } from "./identity";

export type ToolFamily = "frontend" | "backend" | "rhino" | "generative";

export type ToolStage =
  | "selection"
  | "editing"
  | "base-processing"
  | "analysis"
  | "design"
  | "representation"
  | "export";

export interface ToolPermission {
  id: string;
  description: string;
  required: boolean;
}

export interface ToolSideEffect {
  target: "scene" | "project" | "artifact-store" | "rhino" | "external-api";
  description: string;
}

export interface ToolManifest {
  id: EntityId;
  version: string;
  label: string;
  description: string;
  family: ToolFamily;
  stage: ToolStage;
  realtime: boolean;
  requiresProject: boolean;
  requiresMesh: boolean;
  inputSchema: JsonSchemaRef;
  outputSchema?: JsonSchemaRef;
  componentId?: string;
  rendererId?: string;
  jobKind?: string;
  permissions: ToolPermission[];
  sideEffects: ToolSideEffect[];
  defaults?: JsonObject;
}

