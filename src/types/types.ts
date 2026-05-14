export interface AuthResponse {
  body: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface AuthResponseError {
  body: {
    error: string;
  };
}

export interface User {
  _id: string;
  username: string;
  email: string;
}

export interface AccessTokenResponse {
  statusCode: number;
  body: {
    accessToken: string;
  };
  error?: string;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface TerrainPoint {
  lat: number;
  lng: number;
}

export type ProcessingRequestSource =
  | "manual-polygon"
  | "demo-polygon"
  | "imported-file";

export type ProcessingRequestStatus =
  | "draft"
  | "queued"
  | "processing"
  | "demo-ready"
  | "failed";

export interface ProcessingRequest {
  id: string;
  source: ProcessingRequestSource;
  createdAt: string;
  polygon: TerrainPoint[];
  centroid?: TerrainPoint;
  areaM2?: number;
  status: ProcessingRequestStatus;
}

export interface LocalProcessorHealth {
  available: boolean;
  status?: string;
  message?: string;
}

export interface LocalProcessorResponse {
  ok: boolean;
  jobId?: string;
  message?: string;
}

export interface RhinoRoundTripProbeResult {
  ok: boolean;
  endpoint: string;
  status: string;
  durationMs: number;
  message: string;
  responseBytes?: number;
  responsePreview?: string;
  requestSummary?: {
    id?: string;
    source?: ProcessingRequestSource;
    pointCount?: number;
    areaM2?: number;
  };
}

export interface Project {
  _id?: string;
  name: string;
  description: string;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  coordinates: Coordinate[];
  coordinatesCenter: Coordinate;
  thumbnail: string;
  lineas: any;
  malla: any;
  laderas: any;
  suelos: any;
  matriz: any;
  arJson: any;
  genJson: any;
  lineasJson: any;
  objectsJson: any;
  lineasAzulesJson: any;
  lineasAmarillasJson: any;
  listasJson: any;
  areaTerrenoM2: number;
}
