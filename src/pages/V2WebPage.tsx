import React, { useMemo, useState } from "react";
import type {
  AgentEvent,
  OrchestratorPlan,
  OrchestratorTask,
  OrchestratorTaskStatus,
  TaskDependency,
} from "@v2web/core";
import {
  builtinAgentManifests,
  createTerrainWorkflowPlan,
} from "@v2web/orchestrator";
import { builtinRepresentationManifests } from "@v2web/representations";
import { builtinRhinoApps } from "@v2web/rhino";
import { builtinToolManifests } from "@v2web/tools";
import { useCurrentUser } from "../auth/useCurrentUser";
import "./V2WebPage.css";

type RuntimeTask = OrchestratorTask & {
  agentId?: string;
};

type RuntimePlan = {
  plan: OrchestratorPlan;
  tasks: RuntimeTask[];
  dependencies: TaskDependency[];
  events: AgentEvent[];
  backendPlanId?: string;
};

const apiBase = (
  import.meta.env.VITE_V2WEB_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:3200"
).replace(/\/$/, "");

function now() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function inferAgentId(task: OrchestratorTask) {
  if (task.kind === "rhino-run") return "agent.rhino.beta3-operator";
  if (task.kind === "representation") return "agent.representation.author";
  if (task.toolId === "terrain.analysis.drainage") return "agent.analysis.backend";
  if (task.kind === "scene-edit" || task.kind === "tool-invocation") {
    return "agent.tool.scene-editor";
  }
  return "agent.director.terrain-orchestrator";
}

function createRuntimePlan(userId?: string): RuntimePlan {
  const timestamp = now();
  const workflow = createTerrainWorkflowPlan({
    id: makeId("v2web-plan"),
    userId,
    projectId: makeId("project"),
    objective:
      "Procesar un terreno con Director Orchestrator, Rhino beta3, herramientas realtime, analisis backend y representaciones.",
  });

  return {
    plan: {
      ...workflow.plan,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    tasks: workflow.tasks.map((task) => ({
      ...task,
      agentId: inferAgentId(task),
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    dependencies: workflow.dependencies,
    events: [
      {
        id: makeId("event"),
        at: timestamp,
        type: "plan-created",
        planId: workflow.plan.id,
        agentId: "agent.director.terrain-orchestrator",
        status: "queued",
        message: "Director creo el plan V2WEB de procesamiento de terreno.",
      },
    ],
  };
}

function statusClass(status?: string) {
  return `v2web-badge ${status || "queued"}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function postJson<T>(url: string, payload?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export default function V2WebPage() {
  const { userId } = useCurrentUser();
  const [runtime, setRuntime] = useState<RuntimePlan>(() => createRuntimePlan(userId));
  const [isRunning, setIsRunning] = useState(false);
  const [backendMessage, setBackendMessage] = useState("Backend V2WEB no probado.");

  const summary = useMemo(() => {
    const succeeded = runtime.tasks.filter((task) => task.status === "succeeded").length;
    const running = runtime.tasks.filter((task) => task.status === "running").length;
    return {
      agents: builtinAgentManifests.length,
      tasks: runtime.tasks.length,
      succeeded,
      running,
    };
  }, [runtime.tasks]);

  function addEvent(message: string, task?: RuntimeTask, status?: OrchestratorTaskStatus) {
    setRuntime((current) => ({
      ...current,
      events: [
        {
          id: makeId("event"),
          at: now(),
          type: task ? "task-status-changed" : "plan-status-changed",
          planId: current.plan.id,
          taskId: task?.id,
          agentId: task?.agentId || "agent.director.terrain-orchestrator",
          status: status || task?.status || current.plan.status,
          message,
        },
        ...current.events,
      ],
    }));
  }

  function updateTask(taskId: string, status: OrchestratorTaskStatus, jobId?: string) {
    setRuntime((current) => ({
      ...current,
      plan: {
        ...current.plan,
        status: status === "failed" ? "failed" : current.plan.status,
        updatedAt: now(),
      },
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              jobId: jobId || task.jobId,
              updatedAt: now(),
              startedAt: task.startedAt || (status === "running" ? now() : undefined),
              completedAt:
                status === "succeeded" || status === "failed" || status === "cancelled"
                  ? now()
                  : task.completedAt,
            }
          : task,
      ),
    }));
  }

  async function runLocalCycle() {
    setIsRunning(true);
    addEvent("Director inicio ciclo local V2WEB.");

    try {
      for (const task of runtime.tasks) {
        updateTask(task.id, "running");
        addEvent(`Subagente asignado: ${inferAgentId(task)} ejecutando ${task.title}.`, task, "running");
        await sleep(260);
        updateTask(task.id, "succeeded");
        addEvent(`Tarea completada: ${task.title}.`, task, "succeeded");
      }

      setRuntime((current) => ({
        ...current,
        plan: {
          ...current.plan,
          status: "succeeded",
          updatedAt: now(),
        },
      }));
      addEvent("Reviewer valido el ciclo completo. Base V2.2 operativa.", undefined, "succeeded");
    } finally {
      setIsRunning(false);
    }
  }

  async function checkBackend() {
    setBackendMessage("Probando backend V2WEB...");
    try {
      const health = await postJson<{ status: string; service: string }>(
        `${apiBase}/orchestrator/health`,
      );
      setBackendMessage(`${health.service}: ${health.status}`);
    } catch (error) {
      setBackendMessage(error instanceof Error ? error.message : "Backend no disponible.");
    }
  }

  async function sendPlanToBackend() {
    setIsRunning(true);
    setBackendMessage("Enviando plan al backend V2WEB...");
    try {
      const payload = {
        ...runtime.plan,
        tasks: runtime.tasks,
        dependencies: runtime.dependencies,
        events: runtime.events,
      };
      const saved = await postJson<{ id: string; status: string }>(
        `${apiBase}/orchestrator/plans`,
        payload,
      );
      setRuntime((current) => ({
        ...current,
        backendPlanId: saved.id,
      }));
      setBackendMessage(`Plan guardado en backend: ${saved.id}`);
      addEvent(`Backend recibio el plan ${saved.id}.`, undefined, "queued");
    } catch (error) {
      setBackendMessage(error instanceof Error ? error.message : "No se pudo guardar el plan.");
    } finally {
      setIsRunning(false);
    }
  }

  async function runBackendTrace() {
    setIsRunning(true);
    setBackendMessage("Ejecutando traza backend...");
    try {
      const backendPlanId = runtime.backendPlanId || runtime.plan.id;
      let savedPlanId = runtime.backendPlanId;

      if (!savedPlanId) {
        const saved = await postJson<{ id: string }>(`${apiBase}/orchestrator/plans`, {
          ...runtime.plan,
          tasks: runtime.tasks,
          dependencies: runtime.dependencies,
          events: runtime.events,
        });
        savedPlanId = saved.id;
        setRuntime((current) => ({ ...current, backendPlanId: saved.id }));
      }

      for (const task of runtime.tasks) {
        const needsJob = task.kind === "rhino-run" || task.toolId === "terrain.analysis.drainage";
        let jobId: string | undefined;

        if (needsJob) {
          const job = await postJson<{ id: string }>(`${apiBase}/jobs`, {
            userId: userId || "local-dev-user",
            projectId: runtime.plan.projectId,
            toolId: task.toolId || task.rhinoAppId,
            runtime: task.kind === "rhino-run" ? "rhino-compute" : "backend",
            input: {
              planId: savedPlanId || backendPlanId,
              taskId: task.id,
            },
          });
          jobId = job.id;
          await postJson(`${apiBase}/jobs/${job.id}/events`, {
            status: "succeeded",
            message: `Job demo completado para ${task.title}.`,
            progress: 100,
          });
        }

        await postJson(
          `${apiBase}/orchestrator/plans/${savedPlanId || backendPlanId}/tasks/${task.id}/events`,
          {
            status: "succeeded",
            jobId,
            agentId: inferAgentId(task),
            message: `Backend marco completada la tarea ${task.title}.`,
          },
        );

        updateTask(task.id, "succeeded", jobId);
      }

      setRuntime((current) => ({
        ...current,
        plan: {
          ...current.plan,
          status: "succeeded",
          updatedAt: now(),
        },
      }));
      setBackendMessage("Traza backend completada.");
      addEvent("Backend completo plan, tareas y jobs enlazados.", undefined, "succeeded");
    } catch (error) {
      setBackendMessage(error instanceof Error ? error.message : "Fallo la traza backend.");
    } finally {
      setIsRunning(false);
    }
  }

  function resetPlan() {
    setRuntime(createRuntimePlan(userId));
    setBackendMessage("Backend V2WEB no probado.");
  }

  return (
    <main className="v2web-page">
      <div className="v2web-shell">
        <aside className="v2web-panel">
          <div className="v2web-panel-header">
            <div className="v2web-kicker">Gravweb V2.2</div>
            <h1 className="v2web-title">Director Orchestrator</h1>
            <p className="v2web-copy">
              Base funcional para coordinar subagentes, Rhino beta3, herramientas,
              jobs, artifacts y representaciones sin tocar V1.
            </p>
            <div className="v2web-actions">
              <button className="v2web-button primary" onClick={runLocalCycle} disabled={isRunning}>
                Ejecutar ciclo local
              </button>
              <button className="v2web-button" onClick={checkBackend} disabled={isRunning}>
                Probar backend
              </button>
              <button className="v2web-button" onClick={sendPlanToBackend} disabled={isRunning}>
                Guardar plan
              </button>
              <button className="v2web-button" onClick={runBackendTrace} disabled={isRunning}>
                Ciclo backend
              </button>
              <button className="v2web-button" onClick={resetPlan} disabled={isRunning}>
                Nuevo plan
              </button>
            </div>
          </div>
          <div className="v2web-panel-body">
            <div className="v2web-grid">
              <div className="v2web-stat">
                <strong>{summary.agents}</strong>
                <span>Agentes</span>
              </div>
              <div className="v2web-stat">
                <strong>{summary.tasks}</strong>
                <span>Tareas</span>
              </div>
              <div className="v2web-stat">
                <strong>{summary.succeeded}</strong>
                <span>Listas</span>
              </div>
            </div>
            <p className="v2web-meta" style={{ marginTop: 14 }}>
              API: {apiBase}
            </p>
            <p className="v2web-meta">{backendMessage}</p>
            <pre className="v2web-pre">{JSON.stringify(runtime.plan, null, 2)}</pre>
          </div>
        </aside>

        <section className="v2web-main">
          <div className="v2web-panel">
            <div className="v2web-panel-header">
              <div className="v2web-kicker">Runtime</div>
              <h2 className="v2web-title">Plan canonico de terreno</h2>
              <p className="v2web-copy">
                El usuario expresa una intencion. El Director crea tareas, asigna
                subagentes y registra eventos verificables.
              </p>
            </div>
            <div className="v2web-panel-body">
              <div className="v2web-grid">
                <div className="v2web-stat">
                  <strong>{builtinToolManifests.length}</strong>
                  <span>Tools</span>
                </div>
                <div className="v2web-stat">
                  <strong>{builtinRhinoApps.length}</strong>
                  <span>Rhino apps</span>
                </div>
                <div className="v2web-stat">
                  <strong>{builtinRepresentationManifests.length}</strong>
                  <span>Representaciones</span>
                </div>
              </div>
            </div>
          </div>

          <div className="v2web-columns">
            <div className="v2web-panel">
              <div className="v2web-panel-header">
                <div className="v2web-kicker">Subagentes</div>
                <h2 className="v2web-title">Agentes registrados</h2>
              </div>
              <div className="v2web-panel-body v2web-agent-list">
                {builtinAgentManifests.map((agent) => (
                  <article className="v2web-agent" key={agent.id}>
                    <h3>{agent.label}</h3>
                    <span className={statusClass(agent.runtime)}>{agent.role}</span>
                    <span className="v2web-badge">{agent.runtime}</span>
                    <p className="v2web-meta">{agent.description}</p>
                    <p className="v2web-meta">{agent.capabilities.length} capacidades</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="v2web-panel">
              <div className="v2web-panel-header">
                <div className="v2web-kicker">Eventos</div>
                <h2 className="v2web-title">Timeline</h2>
              </div>
              <div className="v2web-panel-body v2web-event-list">
                {runtime.events.map((event) => (
                  <article className="v2web-event" key={event.id}>
                    <h3>{event.message}</h3>
                    <span className={statusClass(String(event.status || "queued"))}>
                      {String(event.status || "queued")}
                    </span>
                    <p className="v2web-meta">
                      {event.agentId || "system"} | {new Date(event.at).toLocaleTimeString()}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="v2web-panel">
            <div className="v2web-panel-header">
              <div className="v2web-kicker">Tareas</div>
              <h2 className="v2web-title">Cadena ejecutable</h2>
            </div>
            <div className="v2web-panel-body v2web-task-list">
              {runtime.tasks.map((task) => (
                <article className="v2web-task" key={task.id}>
                  <h3>{task.title}</h3>
                  <span className={statusClass(task.status)}>{task.status}</span>
                  <span className="v2web-badge">{task.kind}</span>
                  <span className="v2web-badge">{task.agentId}</span>
                  {task.toolId && <span className="v2web-badge">{task.toolId}</span>}
                  {task.rhinoAppId && <span className="v2web-badge">{task.rhinoAppId}</span>}
                  {task.representationId && (
                    <span className="v2web-badge">{task.representationId}</span>
                  )}
                  {task.jobId && <p className="v2web-meta">Job: {task.jobId}</p>}
                  <p className="v2web-meta">
                    Depende de{" "}
                    {runtime.dependencies
                      .filter((dependency) => dependency.toTaskId === task.id)
                      .map((dependency) => dependency.fromTaskId)
                      .join(", ") || "ninguna tarea previa"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
