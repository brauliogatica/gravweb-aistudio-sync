const DEFAULT_NEIGHBOR_COUNT = 8;

const layerMetadata = {
  contours: {
    family: "relief",
    method: "isolines-by-elevation-interval",
    units: "relative contour proximity",
  },
  hillshade: {
    family: "relief",
    method: "normal-vector hillshade",
    units: "illumination",
  },
  elevation: {
    family: "relief",
    method: "normalized elevation",
    units: "relative height",
  },
  aspect: {
    family: "relief",
    method: "normal-vector aspect",
    units: "azimuth",
  },
  relief: {
    family: "relief",
    method: "elevation plus hillshade",
    units: "relative relief",
  },
  polyhedral: {
    family: "relief",
    method: "local roughness and facet variation",
    units: "relative roughness",
  },
  slope: {
    family: "morphometry",
    method: "normal-vector slope",
    units: "degrees",
  },
  "slope-ranges": {
    family: "morphometry",
    method: "FAO-style slope class proxy",
    units: "slope class",
  },
  landforms: {
    family: "morphometry",
    method: "TPI-slope-drainage geomorphon proxy",
    units: "landform class",
  },
  morphometry: {
    family: "morphometry",
    method: "topographic position and curvature proxy",
    units: "relative curvature",
  },
  "land-capability": {
    family: "planning",
    method: "multi-criteria land capability proxy",
    units: "relative capability",
  },
  "erosion-risk": {
    family: "planning",
    method: "stream power proxy",
    units: "relative risk",
  },
  "flow-velocity": {
    family: "hydrology",
    method: "slope-accumulation flow velocity proxy",
    units: "relative velocity",
  },
  drainage: {
    family: "hydrology",
    method: "D8-like steepest descent accumulation on mesh vertices",
    units: "relative accumulation",
  },
  twi: {
    family: "hydrology",
    method: "topographic wetness index proxy",
    units: "ln(a/tan(beta))",
  },
  "valley-depth": {
    family: "hydrology",
    method: "relative valley confinement proxy",
    units: "relative depth",
  },
  viewshed: {
    family: "planning",
    method: "topographic visibility proxy",
    units: "relative visibility",
  },
  flooding: {
    family: "hydrology",
    method: "low-slope wetness and relative elevation proxy",
    units: "relative susceptibility",
  },
  watersheds: {
    family: "hydrology",
    method: "downstream sink basin labels",
    units: "basin class",
  },
  "wind-exposure": {
    family: "planning",
    method: "aspect-elevation wind exposure proxy",
    units: "relative exposure",
  },
};

function parseMaybeJson(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function normalizeArray(values) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;

  for (const value of values) {
    const number = finiteNumber(value, NaN);
    if (!Number.isFinite(number)) continue;
    min = Math.min(min, number);
    max = Math.max(max, number);
    sum += number;
    count += 1;
  }

  if (!count) {
    return {
      values: values.map(() => 0),
      stats: { min: 0, max: 0, mean: 0 },
    };
  }

  const range = Math.max(max - min, 1e-9);
  return {
    values: values.map((value) => clamp((finiteNumber(value) - min) / range)),
    stats: { min, max, mean: sum / count },
  };
}

function vectorFromArray(value) {
  if (Array.isArray(value)) {
    return [
      finiteNumber(value[0]),
      finiteNumber(value[1]),
      finiteNumber(value[2]),
    ];
  }

  if (value && typeof value === "object") {
    const coordinates = value.coordenates || value.coordinates || value;
    return [
      finiteNumber(coordinates.x ?? coordinates[0]),
      finiteNumber(coordinates.y ?? coordinates[1]),
      finiteNumber(coordinates.z ?? coordinates[2]),
    ];
  }

  return [0, 0, 0];
}

function parseNormalString(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return normalizeVector(parts);
}

function normalizeVector(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function distance2d(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function triangulateFaces(faces) {
  if (!Array.isArray(faces)) return [];

  if (typeof faces[0] === "number") {
    const result = [];
    for (let index = 0; index + 2 < faces.length; index += 3) {
      result.push([
        finiteNumber(faces[index]),
        finiteNumber(faces[index + 1]),
        finiteNumber(faces[index + 2]),
      ]);
    }
    return result;
  }

  const result = [];
  for (const face of faces) {
    if (!Array.isArray(face) || face.length < 3) continue;
    const indices = face.map((value) => finiteNumber(value));
    for (let index = 1; index < indices.length - 1; index += 1) {
      result.push([indices[0], indices[index], indices[index + 1]]);
    }
  }
  return result;
}

function computeNormals(vertices, triangles, providedNormals, vertexData) {
  const normals = Array.from({ length: vertices.length }, () => [0, 0, 0]);
  let hasProvided = false;

  if (Array.isArray(providedNormals) && providedNormals.length === vertices.length) {
    for (let index = 0; index < providedNormals.length; index += 1) {
      normals[index] = normalizeVector(vectorFromArray(providedNormals[index]));
    }
    hasProvided = true;
  }

  if (!hasProvided && Array.isArray(vertexData) && vertexData.length === vertices.length) {
    for (let index = 0; index < vertexData.length; index += 1) {
      const normal = parseNormalString(vertexData[index]?.rnormales);
      if (normal) {
        normals[index] = normal;
        hasProvided = true;
      }
    }
  }

  if (hasProvided) return normals;

  for (const [aIndex, bIndex, cIndex] of triangles) {
    const a = vertices[aIndex];
    const b = vertices[bIndex];
    const c = vertices[cIndex];
    if (!a || !b || !c) continue;

    const normal = cross(subtract(b, a), subtract(c, a));
    for (const vertexIndex of [aIndex, bIndex, cIndex]) {
      normals[vertexIndex][0] += normal[0];
      normals[vertexIndex][1] += normal[1];
      normals[vertexIndex][2] += normal[2];
    }
  }

  return normals.map((normal) => normalizeVector(normal));
}

function addNearest(list, candidate, limit) {
  if (candidate.distance <= 0) return;
  if (list.length < limit) {
    list.push(candidate);
    return;
  }

  let farthestIndex = 0;
  for (let index = 1; index < list.length; index += 1) {
    if (list[index].distance > list[farthestIndex].distance) {
      farthestIndex = index;
    }
  }

  if (candidate.distance < list[farthestIndex].distance) {
    list[farthestIndex] = candidate;
  }
}

function buildNearestNeighbors(vertices, limit = DEFAULT_NEIGHBOR_COUNT) {
  const neighbors = Array.from({ length: vertices.length }, () => []);

  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      const distance = distance2d(vertices[i], vertices[j]);
      addNearest(neighbors[i], { index: j, distance }, limit);
      addNearest(neighbors[j], { index: i, distance }, limit);
    }
  }

  return neighbors.map((list) => list.sort((a, b) => a.distance - b.distance));
}

function estimateCellArea(vertices) {
  if (!vertices.length) return 1;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const vertex of vertices) {
    minX = Math.min(minX, vertex[0]);
    maxX = Math.max(maxX, vertex[0]);
    minY = Math.min(minY, vertex[1]);
    maxY = Math.max(maxY, vertex[1]);
  }
  const area = Math.max((maxX - minX) * (maxY - minY), 1);
  return area / vertices.length;
}

function extractMesh(project) {
  const genJson = parseMaybeJson(project?.genJson);
  const rawVertices = Array.isArray(genJson.vertices) ? genJson.vertices : [];
  const rawFaces = Array.isArray(genJson.faces) ? genJson.faces : [];

  const vertices = rawVertices.map(vectorFromArray);
  const triangles = triangulateFaces(rawFaces);
  const vertexData = Array.isArray(genJson.vertex_data) ? genJson.vertex_data : [];
  const normals = computeNormals(vertices, triangles, genJson.normals, vertexData);

  return { vertices, triangles, normals, vertexData };
}

function flowToSinks(flowTarget) {
  const sinkCache = new Array(flowTarget.length).fill(null);

  function findSink(index) {
    if (sinkCache[index] !== null) return sinkCache[index];
    const seen = new Set();
    let current = index;
    while (flowTarget[current] >= 0 && !seen.has(current)) {
      seen.add(current);
      current = flowTarget[current];
    }
    const sink = current;
    for (const seenIndex of seen) {
      sinkCache[seenIndex] = sink;
    }
    sinkCache[index] = sink;
    return sink;
  }

  return flowTarget.map((_target, index) => findSink(index));
}

function deriveFields(mesh, payload) {
  const { vertices, normals } = mesh;
  const neighborCount = Number(payload?.options?.neighborCount || DEFAULT_NEIGHBOR_COUNT);
  const neighbors = buildNearestNeighbors(vertices, clamp(neighborCount, 4, 16));
  const z = vertices.map((vertex) => vertex[2]);
  const normalizedHeight = normalizeArray(z).values;
  const cellArea = estimateCellArea(vertices);

  const localMean = [];
  const localMin = [];
  const localMax = [];
  const roughnessRaw = [];
  const tpiRaw = [];
  const slopeRad = [];
  const aspectRad = [];
  const flowTarget = new Array(vertices.length).fill(-1);

  for (let index = 0; index < vertices.length; index += 1) {
    const neighborList = neighbors[index];
    const neighborZ = neighborList.map((neighbor) => z[neighbor.index]);
    const mean =
      neighborZ.reduce((sum, value) => sum + value, 0) / Math.max(neighborZ.length, 1);
    const min = neighborZ.length ? Math.min(...neighborZ) : z[index];
    const max = neighborZ.length ? Math.max(...neighborZ) : z[index];
    localMean[index] = mean;
    localMin[index] = min;
    localMax[index] = max;
    roughnessRaw[index] = max - min;
    tpiRaw[index] = z[index] - mean;

    const normal = normals[index] || [0, 0, 1];
    const normalSlope = Math.atan2(
      Math.hypot(normal[0], normal[1]),
      Math.max(Math.abs(normal[2]), 1e-9)
    );
    aspectRad[index] = Math.atan2(normal[1], normal[0]);

    let steepest = 0;
    let target = -1;
    for (const neighbor of neighborList) {
      const drop = z[index] - z[neighbor.index];
      const grade = drop / Math.max(neighbor.distance, 1e-9);
      if (grade > steepest) {
        steepest = grade;
        target = neighbor.index;
      }
    }

    slopeRad[index] = Math.max(normalSlope, Math.atan(Math.max(steepest, 0)));
    flowTarget[index] = target;
  }

  const accumulation = new Array(vertices.length).fill(1);
  const order = [...vertices.keys()].sort((a, b) => z[b] - z[a]);
  for (const index of order) {
    const target = flowTarget[index];
    if (target >= 0) accumulation[target] += accumulation[index];
  }

  const slopeDegrees = slopeRad.map((value) => (value * 180) / Math.PI);
  const slope01 = normalizeArray(slopeDegrees).values;
  const roughness01 = normalizeArray(roughnessRaw).values;
  const tpi01 = normalizeArray(tpiRaw).values;
  const accumulationLog = accumulation.map((value) => Math.log1p(value));
  const drainage01 = normalizeArray(accumulationLog).values;
  const twiRaw = accumulation.map((value, index) =>
    Math.log((value * cellArea + cellArea) / (Math.tan(slopeRad[index]) + 0.001))
  );
  const twi01 = normalizeArray(twiRaw).values;
  const sinkIds = flowToSinks(flowTarget);
  const sinkFrequency = new Map();
  for (const sink of sinkIds) {
    sinkFrequency.set(sink, (sinkFrequency.get(sink) || 0) + 1);
  }
  const rankedSinks = [...sinkFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sink]) => sink);
  const sinkRank = new Map(rankedSinks.map((sink, index) => [sink, index]));
  const watershedValues = sinkIds.map((sink) => (sinkRank.get(sink) || 0) % 17);
  const watershed01 = watershedValues.map((value) => value / 16);

  return {
    vertices,
    normals,
    neighbors,
    z,
    normalizedHeight,
    localMean,
    localMin,
    localMax,
    roughnessRaw,
    roughness01,
    tpiRaw,
    tpi01,
    slopeRad,
    slopeDegrees,
    slope01,
    aspectRad,
    flowTarget,
    accumulation,
    drainage01,
    twiRaw,
    twi01,
    watershed01,
  };
}

function shadeFromNormal(normal, options = {}) {
  const azimuthDeg = finiteNumber(options.azimuthDeg, 315);
  const altitudeDeg = finiteNumber(options.altitudeDeg, 45);
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const altitude = (altitudeDeg * Math.PI) / 180;
  const light = [
    Math.sin(azimuth) * Math.cos(altitude),
    Math.cos(azimuth) * Math.cos(altitude),
    Math.sin(altitude),
  ];
  return clamp(
    normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2],
    0,
    1
  );
}

function slopeClass(degrees) {
  if (degrees < 3) return 0;
  if (degrees < 8) return 1;
  if (degrees < 15) return 2;
  if (degrees < 30) return 3;
  return 4;
}

function landformClass(index, fields) {
  const tpi = fields.tpi01[index];
  const slope = fields.slope01[index];
  const drainage = fields.drainage01[index];
  const height = fields.normalizedHeight[index];

  if (drainage > 0.72 && tpi < 0.58) return 8; // channelized
  if (tpi < 0.34 && drainage > 0.38) return 2; // valley
  if (tpi < 0.42 && slope > 0.22) return 4; // hollow
  if (tpi > 0.66 && slope > 0.3) return 1; // ridge
  if (tpi > 0.58 && slope > 0.18) return 3; // spur
  if (slope > 0.62) return 5; // steep slope
  if (slope < 0.16 && Math.abs(tpi - 0.5) < 0.2) return 0; // plain
  if (height > 0.72) return 6; // summit/upper slope
  if (height < 0.28) return 7; // lowland
  return 9; // midslope
}

function computeLayerValues(layerId, fields, payload) {
  const { normalizedHeight, slope01, slopeDegrees, tpi01, roughness01, drainage01, twi01 } =
    fields;

  if (layerId === "contours") {
    const zMin = Math.min(...fields.z);
    const zMax = Math.max(...fields.z);
    const heightRange = Math.max(zMax - zMin, 1);
    const contourCount = Math.max(finiteNumber(payload?.options?.contourCount, 28), 8);
    const raw = fields.z.map((z) => {
      const normalizedElevation = (z - zMin) / heightRange;
      const phase = ((normalizedElevation * contourCount) % 1 + 1) % 1;
      const distance = Math.abs(phase - 0.5) * 2;
      return Math.pow(1 - distance, 2);
    });
    return normalizeArray(raw);
  }

  if (layerId === "hillshade") {
    return {
      values: fields.normals.map((normal) => shadeFromNormal(normal, payload?.options)),
      stats: { min: 0, max: 1, mean: 0 },
    };
  }

  if (layerId === "elevation") return { values: normalizedHeight, stats: normalizeArray(fields.z).stats };

  if (layerId === "aspect") {
    return {
      values: fields.aspectRad.map((value) => (value + Math.PI) / (Math.PI * 2)),
      stats: { min: 0, max: Math.PI * 2, mean: 0 },
    };
  }

  if (layerId === "relief") {
    const values = fields.normals.map((normal, index) =>
      clamp(normalizedHeight[index] * 0.65 + shadeFromNormal(normal, payload?.options) * 0.35)
    );
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "polyhedral") {
    const values = roughness01.map((roughness, index) =>
      clamp(roughness * 0.72 + slope01[index] * 0.28)
    );
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "slope") return { values: slope01, stats: normalizeArray(slopeDegrees).stats };

  if (layerId === "slope-ranges") {
    const raw = slopeDegrees.map((degrees) => slopeClass(degrees));
    return { values: raw.map((value) => value / 4), stats: normalizeArray(raw).stats };
  }

  if (layerId === "landforms") {
    const raw = fields.vertices.map((_vertex, index) => landformClass(index, fields));
    return { values: raw.map((value) => value / 9), stats: normalizeArray(raw).stats };
  }

  if (layerId === "morphometry") {
    const values = tpi01.map((tpi, index) => clamp(tpi * 0.65 + roughness01[index] * 0.35));
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "drainage") {
    return { values: drainage01, stats: normalizeArray(fields.accumulation).stats };
  }

  if (layerId === "twi") return { values: twi01, stats: normalizeArray(fields.twiRaw).stats };

  if (layerId === "flow-velocity") {
    const values = slope01.map((slope, index) =>
      clamp(Math.sqrt(slope) * 0.58 + drainage01[index] * 0.42)
    );
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "valley-depth") {
    const raw = fields.vertices.map((_vertex, index) => {
      const confinement = Math.max(fields.localMax[index] - fields.z[index], 0);
      return confinement * (0.35 + drainage01[index] * 0.65);
    });
    return normalizeArray(raw);
  }

  if (layerId === "flooding") {
    const values = normalizedHeight.map((height, index) =>
      clamp((1 - height) * 0.28 + (1 - slope01[index]) * 0.26 + twi01[index] * 0.46)
    );
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "watersheds") {
    return { values: fields.watershed01, stats: normalizeArray(fields.watershed01).stats };
  }

  if (layerId === "erosion-risk") {
    const values = slope01.map((slope, index) =>
      clamp(slope * 0.5 + drainage01[index] * 0.3 + roughness01[index] * 0.2)
    );
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "land-capability") {
    const values = slope01.map((slope, index) => {
      const flood = (1 - normalizedHeight[index]) * 0.35 + twi01[index] * 0.65;
      const erosion = slope * 0.6 + drainage01[index] * 0.4;
      return clamp(1 - (erosion * 0.46 + flood * 0.34 + roughness01[index] * 0.2));
    });
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "viewshed") {
    const values = normalizedHeight.map((height, index) =>
      clamp(height * 0.62 + tpi01[index] * 0.28 + (1 - slope01[index]) * 0.1)
    );
    return { values, stats: normalizeArray(values).stats };
  }

  if (layerId === "wind-exposure") {
    const windAzimuth = (finiteNumber(payload?.options?.windAzimuthDeg, 225) * Math.PI) / 180;
    const values = fields.aspectRad.map((aspect, index) => {
      const aspectExposure = (Math.cos(aspect - windAzimuth) + 1) / 2;
      return clamp(
        normalizedHeight[index] * 0.42 +
          tpi01[index] * 0.22 +
          aspectExposure * 0.26 +
          slope01[index] * 0.1
      );
    });
    return { values, stats: normalizeArray(values).stats };
  }

  return { values: normalizedHeight, stats: normalizeArray(fields.z).stats };
}

export function computeTerrainAnalysisLayer(project, layerId, payload = {}) {
  const mesh = extractMesh(project);
  if (!mesh.vertices.length) {
    throw new Error("Project does not contain genJson.vertices.");
  }
  if (!mesh.triangles.length) {
    throw new Error("Project does not contain genJson.faces.");
  }

  const fields = deriveFields(mesh, payload);
  const result = computeLayerValues(layerId, fields, payload);
  const metadata = layerMetadata[layerId] ?? {
    family: "unknown",
    method: "mesh-derived scalar analysis",
    units: "relative value",
  };
  const values = result.values.map((value) => Number(clamp(value).toFixed(6)));

  return {
    schemaVersion: "gravweb-terrain-analysis-artifact/v12",
    layerId,
    family: metadata.family,
    method: metadata.method,
    units: metadata.units,
    renderer: "mesh-scalar",
    valueBinding: "vertex-index",
    valueRange: [0, 1],
    values,
    rawStats: result.stats,
    meshSummary: {
      vertexCount: mesh.vertices.length,
      triangleCount: mesh.triangles.length,
      neighborCount: DEFAULT_NEIGHBOR_COUNT,
    },
    scienceNotes: [
      "Computed from the project 3D terrain mesh on the local backend.",
      "Hydrologic layers use a D8-like steepest descent graph over mesh vertices.",
      "Planning layers are normalized decision-support indices, not a regulatory land survey.",
    ],
    createdAt: new Date().toISOString(),
  };
}
