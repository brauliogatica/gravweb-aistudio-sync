import type { JsonObject, JsonSchemaRef } from "./json";
import type { EntityId, Sha256Hex } from "./identity";

export interface RhinoDefinitionRef {
  id: EntityId;
  label: string;
  filename: string;
  version: string;
  sha256?: Sha256Hex;
  storageUri: string;
  cacheKey?: string;
}

export interface RhinoAppManifest {
  id: EntityId;
  version: string;
  label: string;
  description: string;
  definition: RhinoDefinitionRef;
  inputSchema: JsonSchemaRef;
  outputSchema: JsonSchemaRef;
  timeoutMs: number;
  cacheable: boolean;
  maxConcurrency: number;
  requiredPlugins: string[];
  legacyOutputMap?: Record<string, string>;
  defaults?: JsonObject;
}

