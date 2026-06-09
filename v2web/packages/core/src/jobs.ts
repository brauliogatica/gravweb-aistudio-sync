import type { JsonObject } from "./json";
import type { AuditStamp, EntityId } from "./identity";

export type JobStatus =
  | "queued"
  | "running"
  | "waiting_external"
  | "succeeded"
  | "failed"
  | "cancelled";

export type JobRuntime = "backend" | "rhino-compute" | "frontend-worker" | "llm";

export interface JobEvent {
  at: string;
  status: JobStatus;
  message: string;
  progress?: number;
  data?: JsonObject;
}

export interface JobManifest extends AuditStamp {
  id: EntityId;
  projectId?: EntityId;
  userId: EntityId;
  toolId?: EntityId;
  runtime: JobRuntime;
  status: JobStatus;
  input: JsonObject;
  outputArtifactIds: EntityId[];
  events: JobEvent[];
  timeoutMs?: number;
  error?: {
    code: string;
    message: string;
    details?: JsonObject;
  };
}

