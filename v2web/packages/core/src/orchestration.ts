import type { EntityId, IsoDateTime } from "./identity";
import type { JobStatus } from "./jobs";
import type { JsonObject, JsonSchemaRef } from "./json";
import type { RepresentationManifest } from "./representations";
import type { RhinoAppManifest } from "./rhino";
import type { ToolManifest } from "./tools";

export type AgentRole =
  | "orchestrator"
  | "planner"
  | "researcher"
  | "terrain-analyst"
  | "geometry-author"
  | "rhino-operator"
  | "tool-operator"
  | "representation-author"
  | "reviewer"
  | "observer";

export type AgentCapabilityKind =
  | "planning"
  | "reasoning"
  | "tool"
  | "rhino"
  | "representation"
  | "scene"
  | "project"
  | "review"
  | "handoff";

export type AgentRuntime =
  | "llm"
  | "backend"
  | "frontend-worker"
  | "human"
  | "system";

export type AgentExecutableRef =
  | {
      kind: "tool";
      manifest: ToolManifest;
    }
  | {
      kind: "rhino-app";
      manifest: RhinoAppManifest;
    }
  | {
      kind: "representation";
      manifest: RepresentationManifest;
    };

export interface AgentCapability {
  id: EntityId;
  kind: AgentCapabilityKind;
  label: string;
  description?: string;
  inputSchema?: JsonSchemaRef;
  outputSchema?: JsonSchemaRef;
  executable?: AgentExecutableRef;
  defaults?: JsonObject;
}

export interface AgentManifest {
  id: EntityId;
  version: string;
  label: string;
  description: string;
  role: AgentRole;
  runtime: AgentRuntime;
  capabilities: AgentCapability[];
  toolManifests?: ToolManifest[];
  rhinoAppManifests?: RhinoAppManifest[];
  representationManifests?: RepresentationManifest[];
  model?: string;
  maxConcurrency?: number;
  defaults?: JsonObject;
}

export type OrchestratorPlanStatus =
  | "draft"
  | "blocked"
  | "partially_succeeded"
  | JobStatus;

export interface OrchestratorPlan {
  id: EntityId;
  projectId?: EntityId;
  userId?: EntityId;
  objective: string;
  status: OrchestratorPlanStatus;
  orchestratorAgentId: EntityId;
  agentIds: EntityId[];
  rootTaskId?: EntityId;
  context?: JsonObject;
  inputSchema?: JsonSchemaRef;
  outputSchema?: JsonSchemaRef;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type OrchestratorTaskKind =
  | "plan"
  | "research"
  | "tool-invocation"
  | "rhino-run"
  | "representation"
  | "scene-edit"
  | "project-update"
  | "review"
  | "human-input"
  | "handoff";

export type OrchestratorTaskStatus =
  | "draft"
  | "blocked"
  | "skipped"
  | JobStatus;

export interface OrchestratorTask {
  id: EntityId;
  planId: EntityId;
  projectId?: EntityId;
  parentTaskId?: EntityId;
  kind: OrchestratorTaskKind;
  title: string;
  description?: string;
  status: OrchestratorTaskStatus;
  priority?: number;
  requiredCapabilityKinds: AgentCapabilityKind[];
  input: JsonObject;
  output?: JsonObject;
  inputSchema?: JsonSchemaRef;
  outputSchema?: JsonSchemaRef;
  toolId?: EntityId;
  rhinoAppId?: EntityId;
  representationId?: EntityId;
  jobId?: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  error?: {
    code: string;
    message: string;
    details?: JsonObject;
  };
}

export type TaskDependencyKind =
  | "blocks"
  | "requires-output"
  | "requires-approval"
  | "same-agent-after";

export interface TaskDependency {
  id: EntityId;
  planId: EntityId;
  fromTaskId: EntityId;
  toTaskId: EntityId;
  kind: TaskDependencyKind;
  required: boolean;
  condition?: JsonObject;
}

export type TaskAssignmentStatus =
  | "proposed"
  | "accepted"
  | "released"
  | JobStatus;

export interface TaskAssignment {
  id: EntityId;
  planId: EntityId;
  taskId: EntityId;
  agentId: EntityId;
  assignedByAgentId?: EntityId;
  status: TaskAssignmentStatus;
  attempt: number;
  capabilityIds: EntityId[];
  reason?: string;
  context?: JsonObject;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
}

export type AgentMessageKind =
  | "instruction"
  | "observation"
  | "question"
  | "answer"
  | "handoff"
  | "tool-result"
  | "review"
  | "error";

export interface AgentMessage {
  id: EntityId;
  planId?: EntityId;
  taskId?: EntityId;
  assignmentId?: EntityId;
  fromAgentId?: EntityId;
  toAgentId?: EntityId;
  kind: AgentMessageKind;
  content: string;
  data?: JsonObject;
  artifactIds?: EntityId[];
  correlationId?: EntityId;
  createdAt: IsoDateTime;
}

export type AgentEventType =
  | "plan-created"
  | "plan-status-changed"
  | "task-created"
  | "task-status-changed"
  | "assignment-created"
  | "assignment-status-changed"
  | "message-created"
  | "tool-invocation-created"
  | "tool-invocation-status-changed"
  | "agent-error";

export interface AgentEvent {
  id: EntityId;
  at: IsoDateTime;
  type: AgentEventType;
  planId?: EntityId;
  taskId?: EntityId;
  assignmentId?: EntityId;
  agentId?: EntityId;
  status?: JobStatus | OrchestratorPlanStatus | OrchestratorTaskStatus;
  message: string;
  data?: JsonObject;
  correlationId?: EntityId;
}

export type ToolInvocationTarget =
  | {
      kind: "tool";
      manifest: ToolManifest;
    }
  | {
      kind: "rhino-app";
      manifest: RhinoAppManifest;
    }
  | {
      kind: "representation";
      manifest: RepresentationManifest;
    };

export interface ToolInvocation {
  id: EntityId;
  planId?: EntityId;
  taskId?: EntityId;
  assignmentId?: EntityId;
  agentId?: EntityId;
  target: ToolInvocationTarget;
  input: JsonObject;
  status: JobStatus;
  jobId?: EntityId;
  output?: JsonObject;
  outputArtifactIds?: EntityId[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  error?: {
    code: string;
    message: string;
    details?: JsonObject;
  };
}
