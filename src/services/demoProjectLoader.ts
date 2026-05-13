import { setProject, updateProject } from "../redux/slices/projectSlice";

const DEMO_BASE = "/demo";

async function fetchJson<T = unknown>(fileName: string): Promise<T> {
  const response = await fetch(`${DEMO_BASE}/${fileName}`);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${fileName}: ${response.status}`);
  }
  return response.json();
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
