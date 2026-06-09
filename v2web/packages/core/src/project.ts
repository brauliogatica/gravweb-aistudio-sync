import type { JsonObject } from "./json";
import type { AuditStamp, EntityId } from "./identity";

export type ProjectStatus = "draft" | "processing" | "ready" | "archived";

export interface TerrainCoordinate {
  lat: number;
  lng: number;
  z?: number;
}

export interface ProjectMetadata extends AuditStamp {
  id: EntityId;
  userId: EntityId;
  name: string;
  description?: string;
  status: ProjectStatus;
  tags: string[];
  areaM2?: number;
  thumbnailArtifactId?: EntityId;
  terrainArtifactId?: EntityId;
  sceneId?: EntityId;
  coordinatesSummary?: {
    pointCount: number;
    centroid?: TerrainCoordinate;
    bbox?: [number, number, number, number];
  };
  legacy?: {
    sourceProjectId?: string;
    hasGenJson?: boolean;
    hasLineasJson?: boolean;
    hasObjectsJson?: boolean;
  };
}

export type ProjectArtifactKind =
  | "terrain-mesh"
  | "legacy-json"
  | "analysis-layer"
  | "thumbnail"
  | "report"
  | "export"
  | "log"
  | "definition";

export interface ProjectArtifact extends AuditStamp {
  id: EntityId;
  projectId: EntityId;
  kind: ProjectArtifactKind;
  label: string;
  mediaType: string;
  encoding?: "identity" | "gzip" | "br";
  storage: {
    driver: "filesystem" | "object-store" | "inline";
    uri: string;
  };
  byteLength?: number;
  sha256?: string;
  summary?: JsonObject;
  lineage?: {
    jobId?: EntityId;
    toolId?: EntityId;
    rhinoAppId?: EntityId;
    inputArtifactIds?: EntityId[];
  };
}

