import http from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const host = process.env.GRAVWEB_BACKEND_HOST || "127.0.0.1";
const port = Number(process.env.GRAVWEB_BACKEND_PORT || "3100");
const maxBodyBytes =
  Number(process.env.GRAVWEB_BACKEND_MAX_BODY_MB || "80") * 1024 * 1024;

const windowsDataDir = "G:\\backendgravi";
const defaultDataDir =
  process.platform === "win32" && existsSync(windowsDataDir)
    ? windowsDataDir
    : path.join(repoRoot, ".runtime", "backend");

const dataDir = process.env.GRAVWEB_BACKEND_DATA_DIR || defaultDataDir;
const artifactsDir = path.join(dataDir, "artifacts");
const analysisArtifactsDir = path.join(dataDir, "analysis-artifacts");
const projectsPath = path.join(dataDir, "projects.json");
const jobsPath = path.join(dataDir, "jobs.json");

const heavyProjectKeys = [
  "lineas",
  "malla",
  "laderas",
  "suelos",
  "matriz",
  "arJson",
  "genJson",
  "lineasJson",
  "objectsJson",
  "lineasAzulesJson",
  "lineasAmarillasJson",
  "listasJson",
];

const defaultAllowedOrigins = [
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/aistudio\.google\.com$/,
  /^https:\/\/.*\.googleusercontent\.com$/,
  /^https:\/\/.*\.run\.app$/,
];

const configuredOrigins = (process.env.GRAVWEB_BACKEND_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return defaultAllowedOrigins.some((allowedOrigin) =>
    typeof allowedOrigin === "string"
      ? allowedOrigin === origin
      : allowedOrigin.test(origin)
  );
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  const headers = {
    "Cache-Control": "no-store",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    ...corsHeaders(request),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendCorsPreflight(request, response) {
  const origin = request.headers.origin;

  if (origin && !isAllowedOrigin(origin)) {
    sendJson(request, response, 403, {
      ok: false,
      message: "Origin is not allowed by Gravweb local backend.",
    });
    return;
  }

  response.writeHead(204, {
    ...corsHeaders(request),
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Accept,Authorization,X-User-Id",
    "Access-Control-Max-Age": "600",
  });
  response.end();
}

async function ensureStorage() {
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.mkdir(analysisArtifactsDir, { recursive: true });
  await ensureJsonFile(projectsPath, []);
  await ensureJsonFile(jobsPath, []);
}

async function ensureJsonFile(filePath, fallback) {
  try {
    await fs.access(filePath);
  } catch {
    await writeJson(filePath, fallback);
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

async function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJsonBody(request) {
  const body = await readBody(request);
  if (!body.trim()) return null;

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function getUserIdFromRequest(request) {
  const header = request.headers["x-user-id"];
  if (Array.isArray(header)) return header[0] || "local-dev-user";
  return header || "local-dev-user";
}

function stripHeavyProjectData(project) {
  const metadata = { ...project };
  for (const key of heavyProjectKeys) {
    delete metadata[key];
  }
  return metadata;
}

function pickHeavyProjectData(project) {
  const heavy = {};
  for (const key of heavyProjectKeys) {
    heavy[key] = project?.[key] ?? {};
  }
  return heavy;
}

function withProjectDefaults(project) {
  const now = new Date().toISOString();
  return {
    name: "",
    description: "",
    userId: "local-dev-user",
    createdAt: now,
    updatedAt: now,
    coordinates: [],
    coordinatesCenter: { lat: 0, lng: 0 },
    thumbnail: "",
    areaTerrenoM2: 0,
    ...Object.fromEntries(heavyProjectKeys.map((key) => [key, {}])),
    ...project,
  };
}

function sanitizeProjectForList(project) {
  return withProjectDefaults({
    ...project,
    ...Object.fromEntries(heavyProjectKeys.map((key) => [key, {}])),
  });
}

function validateProject(project) {
  if (!project || typeof project !== "object") {
    return "Project payload is required.";
  }

  if (!project.userId || typeof project.userId !== "string") {
    return "Project.userId is required.";
  }

  if (!project.name || typeof project.name !== "string") {
    return "Project.name is required.";
  }

  return null;
}

async function saveProjectArtifact(projectId, heavyData) {
  const artifactPath = path.join(artifactsDir, `${projectId}.json.gz`);
  const compressed = await gzipAsync(JSON.stringify(heavyData));
  await fs.writeFile(artifactPath, compressed);
  return artifactPath;
}

async function loadProjectArtifact(projectId) {
  const artifactPath = path.join(artifactsDir, `${projectId}.json.gz`);
  try {
    const compressed = await fs.readFile(artifactPath);
    const raw = await gunzipAsync(compressed);
    return JSON.parse(raw.toString("utf8"));
  } catch {
    return {};
  }
}

async function deleteProjectArtifact(projectId) {
  const artifactPath = path.join(artifactsDir, `${projectId}.json.gz`);
  await fs.rm(artifactPath, { force: true });
}

async function listProjects() {
  return readJson(projectsPath, []);
}

async function findProject(id) {
  const projects = await listProjects();
  const metadata = projects.find((project) => project._id === id);
  if (!metadata) return null;

  const artifact = await loadProjectArtifact(id);
  return withProjectDefaults({ ...metadata, ...artifact });
}

async function createProject(payload) {
  const now = new Date().toISOString();
  const project = withProjectDefaults({
    ...payload,
    _id: payload._id || randomUUID(),
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });

  const validationError = validateProject(project);
  if (validationError) return { error: validationError };

  const projects = await listProjects();
  const metadata = {
    ...stripHeavyProjectData(project),
    artifactPath: path.relative(dataDir, await saveProjectArtifact(project._id, pickHeavyProjectData(project))),
  };

  const nextProjects = [
    metadata,
    ...projects.filter((current) => current._id !== project._id),
  ];
  await writeJson(projectsPath, nextProjects);

  return { project: withProjectDefaults({ ...metadata, ...pickHeavyProjectData(project) }) };
}

async function updateProject(id, payload) {
  const current = await findProject(id);
  if (!current) return null;

  return createProject({
    ...current,
    ...payload,
    _id: id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

async function deleteProjectById(id) {
  const projects = await listProjects();
  const nextProjects = projects.filter((project) => project._id !== id);
  await writeJson(projectsPath, nextProjects);
  await deleteProjectArtifact(id);
  return projects.length !== nextProjects.length;
}

async function listJobs() {
  return readJson(jobsPath, []);
}

async function saveAnalysisArtifact(projectId, layerKey, artifact) {
  const projectDir = path.join(analysisArtifactsDir, projectId);
  await fs.mkdir(projectDir, { recursive: true });
  const artifactPath = path.join(projectDir, `${layerKey}.json.gz`);
  const compressed = await gzipAsync(JSON.stringify(artifact));
  await fs.writeFile(artifactPath, compressed);
  return artifactPath;
}

async function loadAnalysisArtifact(projectId, layerKey) {
  const artifactPath = path.join(analysisArtifactsDir, projectId, `${layerKey}.json.gz`);
  const compressed = await fs.readFile(artifactPath);
  const raw = await gunzipAsync(compressed);
  return JSON.parse(raw.toString("utf8"));
}

function createAnalysisManifest(projectId, layerKey, payload, artifactPath) {
  const now = new Date().toISOString();
  return {
    id: `analysis-${randomUUID()}`,
    projectId,
    layerId: layerKey,
    status: "ready",
    source: "backend-stub",
    createdAt: now,
    updatedAt: now,
    artifactUrl: `/project/${projectId}/analysis-layers/${layerKey}/artifact`,
    summary: {
      engine: "gravweb-local-backend",
      mode: "stub-ready",
      message:
        "Capa registrada y lista. Reemplazar este artefacto por GDAL/GRASS/Whitebox cuando el motor este disponible.",
      meshSummary: payload?.meshSummary ?? null,
      options: payload?.options ?? {},
      artifactPath: path.relative(dataDir, artifactPath),
    },
  };
}

async function updateProjectAnalysisManifest(projectId, layerKey, manifest) {
  const project = await findProject(projectId);
  if (!project) return null;

  const nextManifests = {
    ...(project.analysisManifests ?? {}),
    [layerKey]: manifest,
  };

  const result = await updateProject(projectId, {
    analysisManifests: nextManifests,
  });

  if (!result?.project) return null;
  return result.project.analysisManifests ?? nextManifests;
}

async function processAnalysisLayer(projectId, layerKey, payload) {
  const artifact = {
    projectId,
    layerId: layerKey,
    createdAt: new Date().toISOString(),
    renderer: "manifest-only",
    values: [],
    note:
      "Artefacto liviano de reserva. El frontend mantiene la capa lista sin cargar datos pesados.",
    input: payload ?? {},
  };
  const artifactPath = await saveAnalysisArtifact(projectId, layerKey, artifact);
  const manifest = createAnalysisManifest(projectId, layerKey, payload, artifactPath);
  const manifests = await updateProjectAnalysisManifest(projectId, layerKey, manifest);

  if (!manifests) {
    return { error: "Project not found." };
  }

  return { manifest };
}

async function createJob(payload, request) {
  const now = new Date().toISOString();
  const job = {
    id: `job-${randomUUID()}`,
    userId: payload?.userId || getUserIdFromRequest(request),
    kind: payload?.kind || "manual",
    status: "queued",
    createdAt: now,
    updatedAt: now,
    agent: payload?.agent || "orchestrator",
    payload: payload?.payload ?? {},
    events: [
      {
        at: now,
        status: "queued",
        message: "Job accepted by local orchestrator stub.",
      },
    ],
  };

  const jobs = await listJobs();
  await writeJson(jobsPath, [job, ...jobs]);
  return job;
}

function localAgents() {
  return [
    {
      id: "orchestrator",
      name: "Gravweb Orchestrator",
      role: "Planifica y coordina procesamiento local.",
      status: "available",
    },
    {
      id: "terrain-processor",
      name: "Terrain Processor",
      role: "Conecta solicitudes de terreno con Rhino/Grasshopper.",
      status: "stub",
    },
    {
      id: "project-archivist",
      name: "Project Archivist",
      role: "Guarda metadata y artefactos pesados en disco.",
      status: "available",
    },
  ];
}

function pathParts(url) {
  return url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const parts = pathParts(url);

  if (request.method === "OPTIONS") {
    sendCorsPreflight(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(request, response, 200, {
      status: "available",
      service: "gravweb-local-backend",
      version: "v10-file-backed-projects",
      dataDir,
      endpoints: [
        "/auth/me",
        "/project",
        "/project/user/:userId",
        "/project/:projectId/analysis-layers",
        "/orchestrator/agents",
        "/orchestrator/jobs",
      ],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth/me") {
    const userId = getUserIdFromRequest(request);
    sendJson(request, response, 200, {
      sub: userId,
      name: "Gravitacional local",
      email: "local@gravitacional.dev",
      provider: "local-backend",
    });
    return;
  }

  if (request.method === "GET" && parts[0] === "project" && parts.length === 1) {
    const projects = await listProjects();
    sendJson(request, response, 200, projects.map(sanitizeProjectForList));
    return;
  }

  if (
    request.method === "GET" &&
    parts[0] === "project" &&
    parts[1] === "user" &&
    parts[2]
  ) {
    const projects = await listProjects();
    sendJson(
      request,
      response,
      200,
      projects
        .filter((project) => project.userId === parts[2])
        .map(sanitizeProjectForList)
    );
    return;
  }

  if (request.method === "POST" && parts[0] === "project" && parts.length === 1) {
    const payload = await readJsonBody(request);
    const result = await createProject(payload);
    if (result.error) {
      sendJson(request, response, 400, { ok: false, message: result.error });
      return;
    }
    sendJson(request, response, 201, result.project);
    return;
  }

  if (parts[0] === "project" && parts[1]) {
    const id = parts[1];

    if (request.method === "GET") {
      if (parts[2] === "analysis-layers" && parts.length === 3) {
        const project = await findProject(id);
        if (!project) {
          sendJson(request, response, 404, { ok: false, message: "Project not found." });
          return;
        }
        sendJson(request, response, 200, project.analysisManifests ?? {});
        return;
      }

      if (
        parts[2] === "analysis-layers" &&
        parts[3] &&
        parts[4] === "artifact"
      ) {
        try {
          sendJson(request, response, 200, await loadAnalysisArtifact(id, parts[3]));
        } catch {
          sendJson(request, response, 404, {
            ok: false,
            message: "Analysis artifact not found.",
          });
        }
        return;
      }

      const project = await findProject(id);
      if (!project) {
        sendJson(request, response, 404, { ok: false, message: "Project not found." });
        return;
      }
      sendJson(request, response, 200, project);
      return;
    }

    if (
      request.method === "POST" &&
      parts[2] === "analysis-layers" &&
      parts[3] &&
      parts[4] === "process"
    ) {
      const payload = await readJsonBody(request);
      const result = await processAnalysisLayer(id, parts[3], payload);
      if (result.error) {
        sendJson(request, response, 404, {
          ok: false,
          message: result.error,
        });
        return;
      }
      sendJson(request, response, 202, {
        ok: true,
        jobId: `analysis-job-${randomUUID()}`,
        manifest: result.manifest,
      });
      return;
    }

    if (request.method === "PUT") {
      const payload = await readJsonBody(request);
      const result = await updateProject(id, payload);
      if (!result) {
        sendJson(request, response, 404, { ok: false, message: "Project not found." });
        return;
      }
      if (result.error) {
        sendJson(request, response, 400, { ok: false, message: result.error });
        return;
      }
      sendJson(request, response, 200, result.project);
      return;
    }

    if (request.method === "DELETE") {
      const deleted = await deleteProjectById(id);
      sendJson(request, response, deleted ? 204 : 404, deleted ? null : {
        ok: false,
        message: "Project not found.",
      });
      return;
    }
  }

  if (
    request.method === "GET" &&
    parts[0] === "orchestrator" &&
    parts[1] === "agents"
  ) {
    sendJson(request, response, 200, localAgents());
    return;
  }

  if (
    request.method === "GET" &&
    parts[0] === "orchestrator" &&
    parts[1] === "jobs" &&
    !parts[2]
  ) {
    const userId = url.searchParams.get("userId");
    const jobs = await listJobs();
    sendJson(
      request,
      response,
      200,
      userId ? jobs.filter((job) => job.userId === userId) : jobs
    );
    return;
  }

  if (
    request.method === "POST" &&
    parts[0] === "orchestrator" &&
    parts[1] === "jobs"
  ) {
    const payload = await readJsonBody(request);
    sendJson(request, response, 202, await createJob(payload, request));
    return;
  }

  if (
    request.method === "GET" &&
    parts[0] === "orchestrator" &&
    parts[1] === "jobs" &&
    parts[2]
  ) {
    const jobs = await listJobs();
    const job = jobs.find((current) => current.id === parts[2]);
    sendJson(
      request,
      response,
      job ? 200 : 404,
      job || { ok: false, message: "Job not found." }
    );
    return;
  }

  sendJson(request, response, 404, {
    ok: false,
    message: "Endpoint not found.",
  });
}

await ensureStorage();

const server = http.createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    sendJson(request, response, 500, {
      ok: false,
      message: error instanceof Error ? error.message : "Unexpected backend error.",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Gravweb local backend listening on http://${host}:${port}`);
  console.log(`Data directory: ${dataDir}`);
});
