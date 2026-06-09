import type {
  AgentManifest,
  OrchestratorPlan,
  OrchestratorTask,
  TaskDependency,
  EntityId,
} from "@v2web/core";
import { builtinRepresentationManifests } from "@v2web/representations";
import { builtinRhinoApps } from "@v2web/rhino";
import { builtinToolManifests } from "@v2web/tools";

const now = "1970-01-01T00:00:00.000Z";

export const builtinAgentManifests: AgentManifest[] = [
  {
    id: "agent.director.terrain-orchestrator",
    version: "0.1.0",
    label: "Terrain Orchestrator",
    description:
      "Coordinates project state, terrain processing, scene tools, analysis jobs, and generated representations.",
    role: "orchestrator",
    runtime: "backend",
    maxConcurrency: 1,
    capabilities: [
      {
        id: "capability.plan.terrain-workflow",
        kind: "planning",
        label: "Terrain workflow planning",
        description: "Creates and updates the canonical terrain workflow plan.",
      },
      {
        id: "capability.handoff.domain-agents",
        kind: "handoff",
        label: "Domain agent handoff",
        description: "Assigns bounded work to Rhino, tool, scene, and representation agents.",
      },
    ],
  },
  {
    id: "agent.rhino.beta3-operator",
    version: "0.1.0",
    label: "Rhino beta3 Operator",
    description: "Runs the legacy beta3 Grasshopper definition through Rhino Compute.",
    role: "rhino-operator",
    runtime: "backend",
    maxConcurrency: 1,
    rhinoAppManifests: [builtinRhinoApps[0]],
    capabilities: [
      {
        id: "capability.rhino.run-beta3",
        kind: "rhino",
        label: "Run beta3 terrain base",
        description: "Produces base terrain artifacts compatible with the V1 viewer.",
        executable: {
          kind: "rhino-app",
          manifest: builtinRhinoApps[0],
        },
      },
    ],
  },
  {
    id: "agent.tool.scene-editor",
    version: "0.1.0",
    label: "Scene Tool Operator",
    description: "Owns realtime frontend tools for mesh picking, polygons, points, and feature edits.",
    role: "tool-operator",
    runtime: "frontend-worker",
    maxConcurrency: 4,
    toolManifests: builtinToolManifests.filter((tool) => tool.family === "frontend"),
    capabilities: builtinToolManifests
      .filter((tool) => tool.family === "frontend")
      .map((tool) => ({
        id: `capability.tool.${tool.id}`,
        kind: "tool" as const,
        label: tool.label,
        description: tool.description,
        executable: {
          kind: "tool" as const,
          manifest: tool,
        },
      })),
  },
  {
    id: "agent.analysis.backend",
    version: "0.1.0",
    label: "Backend Analysis Operator",
    description: "Runs heavier terrain analysis tasks as backend jobs and stores artifacts.",
    role: "terrain-analyst",
    runtime: "backend",
    maxConcurrency: 2,
    toolManifests: builtinToolManifests.filter((tool) => tool.family === "backend"),
    capabilities: builtinToolManifests
      .filter((tool) => tool.family === "backend")
      .map((tool) => ({
        id: `capability.analysis.${tool.id}`,
        kind: "tool" as const,
        label: tool.label,
        description: tool.description,
        executable: {
          kind: "tool" as const,
          manifest: tool,
        },
      })),
  },
  {
    id: "agent.representation.author",
    version: "0.1.0",
    label: "Representation Author",
    description: "Builds reports, charts, tooltips, and generated project views from safe specs.",
    role: "representation-author",
    runtime: "llm",
    maxConcurrency: 2,
    representationManifests: builtinRepresentationManifests,
    capabilities: builtinRepresentationManifests.map((representation) => ({
      id: `capability.representation.${representation.id}`,
      kind: "representation" as const,
      label: representation.label,
      description: representation.description,
      executable: {
        kind: "representation" as const,
        manifest: representation,
      },
    })),
  },
];

export function getBuiltinAgentManifest(id: EntityId) {
  return builtinAgentManifests.find((agent) => agent.id === id);
}

export function createTerrainWorkflowPlan(params: {
  id: EntityId;
  projectId?: EntityId;
  userId?: EntityId;
  objective?: string;
}): {
  plan: OrchestratorPlan;
  tasks: OrchestratorTask[];
  dependencies: TaskDependency[];
} {
  const planId = params.id;
  const selectTaskId = `${planId}.task.select-terrain`;
  const rhinoTaskId = `${planId}.task.run-beta3`;
  const editTaskId = `${planId}.task.realtime-edit`;
  const analysisTaskId = `${planId}.task.backend-analysis`;
  const representationTaskId = `${planId}.task.generate-representations`;

  const baseTask = {
    planId,
    projectId: params.projectId,
    status: "queued" as const,
    createdAt: now,
    updatedAt: now,
    input: {},
  };

  const tasks: OrchestratorTask[] = [
    {
      ...baseTask,
      id: selectTaskId,
      kind: "tool-invocation",
      title: "Select or edit terrain polygon",
      requiredCapabilityKinds: ["tool", "scene"],
      toolId: "terrain.selection.polygon-editor",
    },
    {
      ...baseTask,
      id: rhinoTaskId,
      kind: "rhino-run",
      title: "Generate base terrain with beta3",
      requiredCapabilityKinds: ["rhino"],
      rhinoAppId: "rhino.terrain-base.beta3",
    },
    {
      ...baseTask,
      id: editTaskId,
      kind: "scene-edit",
      title: "Enable realtime mesh interaction",
      requiredCapabilityKinds: ["tool", "scene"],
      toolId: "terrain.interaction.point-marker",
    },
    {
      ...baseTask,
      id: analysisTaskId,
      kind: "tool-invocation",
      title: "Run backend terrain analysis layers",
      requiredCapabilityKinds: ["tool", "project"],
      toolId: "terrain.analysis.drainage",
    },
    {
      ...baseTask,
      id: representationTaskId,
      kind: "representation",
      title: "Generate project representations",
      requiredCapabilityKinds: ["representation"],
      representationId: "representation.project.summary-report",
    },
  ];

  const dependencies: TaskDependency[] = [
    {
      id: `${planId}.dependency.selection-before-rhino`,
      planId,
      fromTaskId: selectTaskId,
      toTaskId: rhinoTaskId,
      kind: "requires-output",
      required: true,
    },
    {
      id: `${planId}.dependency.rhino-before-edit`,
      planId,
      fromTaskId: rhinoTaskId,
      toTaskId: editTaskId,
      kind: "requires-output",
      required: true,
    },
    {
      id: `${planId}.dependency.rhino-before-analysis`,
      planId,
      fromTaskId: rhinoTaskId,
      toTaskId: analysisTaskId,
      kind: "requires-output",
      required: true,
    },
    {
      id: `${planId}.dependency.analysis-before-representation`,
      planId,
      fromTaskId: analysisTaskId,
      toTaskId: representationTaskId,
      kind: "requires-output",
      required: false,
    },
  ];

  return {
    plan: {
      id: planId,
      projectId: params.projectId,
      userId: params.userId,
      objective:
        params.objective ||
        "Coordinate terrain selection, Rhino processing, realtime tools, analysis layers, and project views.",
      status: "queued",
      orchestratorAgentId: "agent.director.terrain-orchestrator",
      agentIds: builtinAgentManifests.map((agent) => agent.id),
      rootTaskId: selectTaskId,
      createdAt: now,
      updatedAt: now,
    },
    tasks,
    dependencies,
  };
}
