import type { JsonObject } from "./json";
import type { AuditStamp, EntityId } from "./identity";

export interface TerrainBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface TerrainMeshRef {
  artifactId: EntityId;
  format: "legacy-gen-json" | "indexed-buffer-geometry" | "glb";
  bounds?: TerrainBounds;
  vertexCount?: number;
  faceCount?: number;
  coordinateSystem?: string;
}

export type TerrainFeatureKind =
  | "point"
  | "polygon"
  | "path"
  | "object"
  | "annotation";

export interface TerrainFeatureBase extends AuditStamp {
  id: EntityId;
  projectId: EntityId;
  kind: TerrainFeatureKind;
  label: string;
  role?: string;
  locked?: boolean;
  visible?: boolean;
  properties?: JsonObject;
}

export interface TerrainPointFeature extends TerrainFeatureBase {
  kind: "point";
  position: [number, number, number];
}

export interface TerrainPolygonFeature extends TerrainFeatureBase {
  kind: "polygon";
  vertices: Array<[number, number, number]>;
  closed: true;
}

export interface TerrainPathFeature extends TerrainFeatureBase {
  kind: "path";
  vertices: Array<[number, number, number]>;
  closed?: boolean;
}

export interface TerrainObjectFeature extends TerrainFeatureBase {
  kind: "object";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  assetArtifactId?: EntityId;
}

export interface TerrainAnnotationFeature extends TerrainFeatureBase {
  kind: "annotation";
  anchor: [number, number, number];
  body: string;
  format: "plain" | "markdown";
}

export type TerrainFeature =
  | TerrainPointFeature
  | TerrainPolygonFeature
  | TerrainPathFeature
  | TerrainObjectFeature
  | TerrainAnnotationFeature;

export interface TerrainLayerRef {
  id: EntityId;
  label: string;
  artifactId?: EntityId;
  renderer: "mesh-scalar" | "vector" | "raster" | "object-overlay";
  visible: boolean;
  opacity: number;
}

export interface TerrainScene extends AuditStamp {
  id: EntityId;
  projectId: EntityId;
  terrainMesh?: TerrainMeshRef;
  features: TerrainFeature[];
  layers: TerrainLayerRef[];
  activeToolId?: EntityId;
  selectedFeatureIds: EntityId[];
  camera?: JsonObject;
}

