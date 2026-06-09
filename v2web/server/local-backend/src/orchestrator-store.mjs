import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_USER_ID = "local-dev-user";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeTask(task, now) {
  return {
    ...task,
    id: task.id || `task-${randomUUID()}`,
    planId: task.planId,
    parentTaskId: task.parentTaskId,
    kind: task.kind || "plan",
    title: task.title || task.name || "Untitled orchestration task",
    agentId: task.agentId || task.subagentId || "local-subagent",
    status: task.status || "queued",
    requiredCapabilityKinds: toArray(task.requiredCapabilityKinds),
    input: task.input || {},
    output: task.output || {},
    toolId: task.toolId,
    rhinoAppId: task.rhinoAppId,
    representationId: task.representationId,
    jobId: task.jobId,
    dependsOnTaskIds: toArray(task.dependsOnTaskIds),
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
  };
}

function normalizeEvent(event, now, fallbackStatus) {
  return {
    id: event.id || `event-${randomUUID()}`,
    planId: event.planId,
    taskId: event.taskId,
    assignmentId: event.assignmentId,
    agentId: event.agentId,
    at: event.at || now,
    type: event.type || "orchestrator.event",
    status: event.status || fallbackStatus,
    message: event.message || "Orchestrator event recorded.",
    data: event.data || {},
  };
}

export class FileOrchestratorStore {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.plansPath = path.join(rootDir, "orchestrator-plans.json");
  }

  async ensure() {
    await fs.mkdir(this.rootDir, { recursive: true });
    try {
      await fs.access(this.plansPath);
    } catch {
      await this.writePlans([]);
    }
  }

  async listPlans() {
    await this.ensure();
    try {
      return JSON.parse(await fs.readFile(this.plansPath, "utf8"));
    } catch {
      return [];
    }
  }

  async createPlan(payload) {
    const now = new Date().toISOString();
    const status = payload.status || "queued";
    const planId = payload.id || `plan-${randomUUID()}`;
    const plan = {
      id: planId,
      userId: payload.userId || payload.createdBy || DEFAULT_USER_ID,
      projectId: payload.projectId,
      objective: payload.objective || payload.goal || payload.prompt || "",
      orchestratorAgentId: payload.orchestratorAgentId || "agent.director.terrain-orchestrator",
      agentIds: toArray(payload.agentIds),
      status,
      rootTaskId: payload.rootTaskId,
      context: payload.context || {},
      tasks: toArray(payload.tasks).map((task) =>
        normalizeTask({ ...(task || {}), planId }, now),
      ),
      dependencies: toArray(payload.dependencies),
      assignments: toArray(payload.assignments),
      messages: toArray(payload.messages),
      metadata: payload.metadata || {},
      createdAt: now,
      updatedAt: now,
      createdBy: payload.createdBy || payload.userId || DEFAULT_USER_ID,
      updatedBy: payload.updatedBy || payload.createdBy || payload.userId || DEFAULT_USER_ID,
      events: [
        normalizeEvent(
          {
            type: "orchestrator.plan.created",
            status,
            message: "Plan accepted by V2WEB local orchestrator.",
          },
          now,
          status,
        ),
        ...toArray(payload.events).map((event) => normalizeEvent(event || {}, now, status)),
      ],
    };

    const plans = await this.listPlans();
    await this.writePlans([plan, ...plans]);
    return plan;
  }

  async getPlan(id) {
    const plans = await this.listPlans();
    return plans.find((plan) => plan.id === id) || null;
  }

  async addPlanEvent(id, payload) {
    const plans = await this.listPlans();
    const planIndex = plans.findIndex((plan) => plan.id === id);
    if (planIndex === -1) return null;

    const now = new Date().toISOString();
    const currentPlan = plans[planIndex];
    const status = payload.status || currentPlan.status || "queued";
    const updatedPlan = {
      ...currentPlan,
      status,
      updatedAt: now,
      updatedBy: payload.updatedBy || payload.userId || currentPlan.updatedBy,
      events: [
        ...toArray(currentPlan.events),
        normalizeEvent(payload, now, status),
      ],
    };

    plans[planIndex] = updatedPlan;
    await this.writePlans(plans);
    return updatedPlan;
  }

  async addTaskEvent(planId, taskId, payload) {
    const plans = await this.listPlans();
    const planIndex = plans.findIndex((plan) => plan.id === planId);
    if (planIndex === -1) return null;

    const now = new Date().toISOString();
    const currentPlan = plans[planIndex];
    const tasks = toArray(currentPlan.tasks);
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) return null;

    const status = payload.status || tasks[taskIndex].status || "queued";
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      status,
      jobId: payload.jobId || tasks[taskIndex].jobId,
      output: payload.output || tasks[taskIndex].output,
      error: payload.error || tasks[taskIndex].error,
      updatedAt: now,
      startedAt:
        payload.startedAt ||
        tasks[taskIndex].startedAt ||
        (status === "running" ? now : undefined),
      completedAt:
        payload.completedAt ||
        tasks[taskIndex].completedAt ||
        (["succeeded", "failed", "cancelled"].includes(status) ? now : undefined),
    };

    const updatedPlan = {
      ...currentPlan,
      status: payload.planStatus || currentPlan.status,
      updatedAt: now,
      updatedBy: payload.updatedBy || payload.userId || currentPlan.updatedBy,
      tasks,
      events: [
        ...toArray(currentPlan.events),
        normalizeEvent(
          {
            ...payload,
            type: payload.type || "orchestrator.task.event",
            planId,
            taskId,
            status,
            message: payload.message || `Task ${taskId} changed to ${status}.`,
          },
          now,
          status,
        ),
      ],
    };

    plans[planIndex] = updatedPlan;
    await this.writePlans(plans);
    return updatedPlan;
  }

  async writePlans(plans) {
    await fs.mkdir(path.dirname(this.plansPath), { recursive: true });
    const tmpPath = `${this.plansPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(plans, null, 2), "utf8");
    await fs.rename(tmpPath, this.plansPath);
  }
}
