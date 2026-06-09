import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileJobStore } from "./job-store.mjs";
import { FileOrchestratorStore } from "./orchestrator-store.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoV2Root = path.resolve(__dirname, "../../..");

const host = process.env.GRAVWEB_V2WEB_HOST || "127.0.0.1";
const port = Number(process.env.GRAVWEB_V2WEB_PORT || "3200");
const dataDir =
  process.env.GRAVWEB_V2WEB_DATA_DIR ||
  path.join(repoV2Root, ".runtime", "local-backend");

const jobStore = new FileJobStore(dataDir);
const orchestratorStore = new FileOrchestratorStore(dataDir);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept,Authorization,X-User-Id",
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8").trim();
  return body ? JSON.parse(body) : {};
}

async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, null);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      status: "available",
      service: "gravweb-v2web-local-backend",
      version: "v2web-0",
      dataDir,
      endpoints: [
        "/health",
        "/jobs",
        "/jobs/:id",
        "/jobs/:id/events",
        "/orchestrator/health",
        "/orchestrator/plans",
        "/orchestrator/plans/:id",
        "/orchestrator/plans/:id/events",
        "/orchestrator/plans/:id/tasks/:taskId/events",
      ],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/orchestrator/health") {
    sendJson(response, 200, {
      status: "available",
      service: "gravweb-v2web-local-orchestrator",
      version: "v2web-0",
      dataDir,
      backingStore: "orchestrator-plans.json",
      endpoints: [
        "/orchestrator/health",
        "/orchestrator/plans",
        "/orchestrator/plans/:id",
        "/orchestrator/plans/:id/events",
      ],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/jobs") {
    sendJson(response, 200, await jobStore.listJobs());
    return;
  }

  if (request.method === "POST" && url.pathname === "/jobs") {
    const payload = await readJsonBody(request);
    sendJson(response, 202, await jobStore.createJob(payload));
    return;
  }

  const jobMatch = url.pathname.match(/^\/jobs\/([^/]+)$/);
  if (request.method === "GET" && jobMatch) {
    const job = await jobStore.getJob(decodeURIComponent(jobMatch[1]));
    sendJson(response, job ? 200 : 404, job || { ok: false, message: "Job not found." });
    return;
  }

  const jobEventMatch = url.pathname.match(/^\/jobs\/([^/]+)\/events$/);
  if (request.method === "POST" && jobEventMatch) {
    const payload = await readJsonBody(request);
    const job = await jobStore.addJobEvent(decodeURIComponent(jobEventMatch[1]), payload);
    sendJson(response, job ? 200 : 404, job || { ok: false, message: "Job not found." });
    return;
  }

  if (request.method === "GET" && url.pathname === "/orchestrator/plans") {
    sendJson(response, 200, await orchestratorStore.listPlans());
    return;
  }

  if (request.method === "POST" && url.pathname === "/orchestrator/plans") {
    const payload = await readJsonBody(request);
    sendJson(response, 202, await orchestratorStore.createPlan(payload));
    return;
  }

  const planEventMatch = url.pathname.match(/^\/orchestrator\/plans\/([^/]+)\/events$/);
  if (request.method === "POST" && planEventMatch) {
    const payload = await readJsonBody(request);
    const plan = await orchestratorStore.addPlanEvent(
      decodeURIComponent(planEventMatch[1]),
      payload,
    );
    sendJson(response, plan ? 200 : 404, plan || { ok: false, message: "Plan not found." });
    return;
  }

  const taskEventMatch = url.pathname.match(
    /^\/orchestrator\/plans\/([^/]+)\/tasks\/([^/]+)\/events$/,
  );
  if (request.method === "POST" && taskEventMatch) {
    const payload = await readJsonBody(request);
    const plan = await orchestratorStore.addTaskEvent(
      decodeURIComponent(taskEventMatch[1]),
      decodeURIComponent(taskEventMatch[2]),
      payload,
    );
    sendJson(response, plan ? 200 : 404, plan || { ok: false, message: "Plan or task not found." });
    return;
  }

  const planMatch = url.pathname.match(/^\/orchestrator\/plans\/([^/]+)$/);
  if (request.method === "GET" && planMatch) {
    const plan = await orchestratorStore.getPlan(decodeURIComponent(planMatch[1]));
    sendJson(response, plan ? 200 : 404, plan || { ok: false, message: "Plan not found." });
    return;
  }

  sendJson(response, 404, { ok: false, message: "Endpoint not found." });
}

await jobStore.ensure();
await orchestratorStore.ensure();

http
  .createServer(async (request, response) => {
    try {
      await handleRequest(request, response);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        message: error instanceof Error ? error.message : "Unexpected V2WEB error.",
      });
    }
  })
  .listen(port, host, () => {
    console.log(`Gravweb V2WEB backend listening on http://${host}:${port}`);
    console.log(`Data directory: ${dataDir}`);
  });
