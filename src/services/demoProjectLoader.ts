import { setProject, updateProject } from "../redux/slices/projectSlice";

const DEMO_BASE = "/demo";

async function fetchDemoText(fileName: string): Promise<string> {
  const compressedResponse = await fetch(`${DEMO_BASE}/${fileName}.gz`);
  if (compressedResponse.ok) {
    return readGzipText(compressedResponse, fileName);
  }

  const response = await fetch(`${DEMO_BASE}/${fileName}`);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${fileName}: ${response.status}`);
  }

  return response.text();
}

async function readGzipText(response: Response, fileName: string): Promise<string> {
  const encoding = response.headers.get("content-encoding")?.toLowerCase() ?? "";
  if (encoding.includes("gzip")) {
    return response.text();
  }

  if (!response.body || typeof DecompressionStream === "undefined") {
    throw new Error(`El navegador no puede descomprimir ${fileName}.`);
  }

  const decompressedStream = response.body.pipeThrough(
    new DecompressionStream("gzip")
  );
  return new Response(decompressedStream).text();
}

async function fetchJson<T = unknown>(fileName: string): Promise<T> {
  const text = await fetchDemoText(fileName);

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (fileName === "ARjson.json") {
      return parseConcatenatedArJson(text) as T;
    }
    throw error;
  }
}

function parseConcatenatedArJson(text: string) {
  const values: any[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  // The legacy AR export can arrive as multiple JSON objects concatenated.
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        values.push(JSON.parse(text.slice(start, index + 1)));
        start = -1;
      }
    }
  }

  if (values.length === 1) {
    return values[0];
  }

  return {
    Proyectos: values.flatMap((value) =>
      Array.isArray(value?.Proyectos) ? value.Proyectos : [value]
    ),
  };
}

export async function loadDemoProjectData(dispatch: any) {
  const [
    project,
    genJson,
    lineasJson,
    lineasAmarillasJson,
    lineasAzulesJson,
    listasJson,
    echartsJson,
    arJson,
    objectsJson,
  ] = await Promise.all([
    fetchJson("project.json"),
    fetchJson("gen.json"),
    fetchJson("lineas.json"),
    fetchJson("lineasamarillas.json"),
    fetchJson("lineasazules.json"),
    fetchJson("listas.json"),
    fetchJson("echarts.json"),
    fetchJson("ARjson.json"),
    fetchJson("objects.json"),
  ]);

  dispatch(setProject(project));
  dispatch(updateProject({ key: "genJson", value: genJson }));
  dispatch(updateProject({ key: "lineasJson", value: lineasJson }));
  dispatch(updateProject({ key: "lineasAmarillasJson", value: lineasAmarillasJson }));
  dispatch(updateProject({ key: "lineasAzulesJson", value: lineasAzulesJson }));
  dispatch(updateProject({ key: "listasJson", value: listasJson }));
  dispatch(updateProject({ key: "echartsJson", value: echartsJson }));
  dispatch(updateProject({ key: "arJson", value: arJson }));
  dispatch(updateProject({ key: "objectsJson", value: objectsJson }));
}
