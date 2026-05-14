import http from "node:http";
import { randomUUID } from "node:crypto";

const host = process.env.LOCAL_PROCESSOR_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_PROCESSOR_PORT || "8787");
const maxBodyBytes = 1024 * 1024;

const defaultAllowedOrigins = [
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/ai\.studio$/,
  /^https:\/\/.*\.googleusercontent\.com$/,
];

const configuredOrigins = (process.env.LOCAL_PROCESSOR_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return defaultAllowedOrigins.some((allowedOrigin) =>
    typeof allowedOrigin === "string"
      ? allowedOrigin === origin
      : allowedOrigin.test(origin)
  );
};

const sendJson = (request, response, statusCode, payload) => {
  const origin = request.headers.origin;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(payload, null, 2));
};

const sendCorsPreflight = (request, response) => {
  const origin = request.headers.origin;

  if (origin && !isAllowedOrigin(origin)) {
    sendJson(request, response, 403, {
      ok: false,
      message: "Origin is not allowed by local processor CORS policy.",
    });
    return;
  }

  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept",
    "Access-Control-Max-Age": "600",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  response.writeHead(204, headers);
  response.end();
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body.trim()) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });

const isTerrainPoint = (value) =>
  value &&
  typeof value.lat === "number" &&
  Number.isFinite(value.lat) &&
  typeof value.lng === "number" &&
  Number.isFinite(value.lng);

const validateProcessingRequest = (payload) => {
  if (!payload || typeof payload !== "object") {
    return "Payload must be a ProcessingRequest object.";
  }

  if (typeof payload.id !== "string" || payload.id.length < 1) {
    return "ProcessingRequest.id is required.";
  }

  if (typeof payload.source !== "string" || payload.source.length < 1) {
    return "ProcessingRequest.source is required.";
  }

  if (!Array.isArray(payload.polygon) || payload.polygon.length < 3) {
    return "ProcessingRequest.polygon must contain at least 3 points.";
  }

  if (!payload.polygon.every(isTerrainPoint)) {
    return "ProcessingRequest.polygon contains invalid points.";
  }

  return null;
};

const buildTerrainSummary = (request) => {
  const pointCount = request.polygon.length;
  const centroid =
    request.centroid && isTerrainPoint(request.centroid)
      ? request.centroid
      : request.polygon.reduce(
          (acc, point) => ({
            lat: acc.lat + point.lat / pointCount,
            lng: acc.lng + point.lng / pointCount,
          }),
          { lat: 0, lng: 0 }
        );

  return {
    requestId: request.id,
    source: request.source,
    pointCount,
    centroid,
    areaM2: typeof request.areaM2 === "number" ? request.areaM2 : null,
  };
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    sendCorsPreflight(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(request, response, 200, {
      status: "available",
      message: "Gravweb local processor stub ready.",
      version: "v5-local-stub",
      endpoints: ["/health", "/process-terrain"],
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/process-terrain") {
    try {
      const payload = await readJsonBody(request);
      const validationError = validateProcessingRequest(payload);

      if (validationError) {
        sendJson(request, response, 400, {
          ok: false,
          message: validationError,
        });
        return;
      }

      const jobId = `local-job-${randomUUID()}`;

      sendJson(request, response, 202, {
        ok: true,
        jobId,
        message: "Processing request accepted by local stub processor.",
        receivedAt: new Date().toISOString(),
        summary: buildTerrainSummary(payload),
      });
    } catch (error) {
      sendJson(request, response, 400, {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to read processing request.",
      });
    }
    return;
  }

  sendJson(request, response, 404, {
    ok: false,
    message: "Endpoint not found.",
  });
});

server.listen(port, host, () => {
  console.log(`Gravweb local processor listening on http://${host}:${port}`);
});
