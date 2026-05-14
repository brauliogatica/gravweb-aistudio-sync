const outputToProjectKey: Record<string, string> = {
  lines: "lineas",
  mesh: "malla",
  hillsides: "laderas",
  soils: "suelos",
  matrix: "matriz",
  ARjson: "arJson",
  Genjson: "genJson",
  Lineasjson: "lineasJson",
  objectsjson: "objectsJson",
  lineasazulesjson: "lineasAzulesJson",
  lineasamarillasjson: "lineasAmarillasJson",
  listasjson: "listasJson",
};

export function extractProjectUpdatesFromGrasshopper(response: any) {
  const updates: Record<string, unknown> = {};
  const values = Array.isArray(response?.values) ? response.values : [];

  for (const value of values) {
    const projectKey = outputToProjectKey[value?.ParamName];
    if (!projectKey || !value?.InnerTree) continue;

    const decodedValue = decodeFirstInnerTreeValue(value.InnerTree);
    if (decodedValue !== undefined && decodedValue !== null) {
      updates[projectKey] = decodedValue;
    }
  }

  return updates;
}

function decodeFirstInnerTreeValue(innerTree: Record<string, unknown>) {
  for (const branchKey of Object.keys(innerTree)) {
    const branch = (innerTree as any)[branchKey];
    if (!Array.isArray(branch) || branch.length === 0) continue;

    return decodeGrasshopperItem(branch[0]);
  }

  return undefined;
}

function decodeGrasshopperItem(item: any) {
  if (!item || typeof item.data === "undefined") return undefined;

  let value: unknown = item.data;

  for (let index = 0; index < 3; index += 1) {
    if (typeof value !== "string") return value;

    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

export function getLegacyGrasshopperOutputKeys() {
  return Object.values(outputToProjectKey);
}
