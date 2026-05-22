export type TerrainAnalysisFolderId =
  | "relief"
  | "slope-form"
  | "hydrology"
  | "risk-planning";

export type TerrainAnalysisComputeMode = "mesh" | "backend";

export interface TerrainAnalysisFolder {
  id: TerrainAnalysisFolderId;
  label: string;
}

export interface TerrainAnalysisLayerDefinition {
  id: string;
  index: number;
  label: string;
  folderId: TerrainAnalysisFolderId;
  computeMode: TerrainAnalysisComputeMode;
  description: string;
}

export const terrainAnalysisFolders: TerrainAnalysisFolder[] = [
  { id: "relief", label: "Relieve" },
  { id: "slope-form", label: "Pendiente y forma" },
  { id: "hydrology", label: "Hidrologia" },
  { id: "risk-planning", label: "Riesgo y planificacion" },
];

export const terrainAnalysisLayers: TerrainAnalysisLayerDefinition[] = [
  {
    id: "contours",
    index: 1,
    label: "Contornos",
    folderId: "relief",
    computeMode: "mesh",
    description: "Lineas de nivel derivadas de la malla 3D.",
  },
  {
    id: "hillshade",
    index: 2,
    label: "Sombra de colina",
    folderId: "relief",
    computeMode: "mesh",
    description: "Sombreado por normales y direccion de luz.",
  },
  {
    id: "elevation",
    index: 3,
    label: "Elevacion",
    folderId: "relief",
    computeMode: "mesh",
    description: "Gradiente de altura Z de la malla.",
  },
  {
    id: "aspect",
    index: 4,
    label: "Aspecto",
    folderId: "relief",
    computeMode: "mesh",
    description: "Orientacion de pendiente por normales.",
  },
  {
    id: "relief",
    index: 5,
    label: "Alivio",
    folderId: "relief",
    computeMode: "mesh",
    description: "Elevacion combinada con sombreado.",
  },
  {
    id: "polyhedral",
    index: 6,
    label: "Poliedrico",
    folderId: "relief",
    computeMode: "mesh",
    description: "Lectura facetada de triangulos y normales.",
  },
  {
    id: "slope",
    index: 7,
    label: "Pendiente",
    folderId: "slope-form",
    computeMode: "mesh",
    description: "Pendiente estimada desde normales.",
  },
  {
    id: "slope-ranges",
    index: 8,
    label: "Rangos de pendiente",
    folderId: "slope-form",
    computeMode: "mesh",
    description: "Clasificacion discreta de pendientes.",
  },
  {
    id: "landforms",
    index: 9,
    label: "Formas del relieve",
    folderId: "slope-form",
    computeMode: "mesh",
    description: "Clasificacion preliminar por altura y pendiente.",
  },
  {
    id: "morphometry",
    index: 10,
    label: "Morfometria",
    folderId: "slope-form",
    computeMode: "mesh",
    description: "Lectura de convexidad/curvatura disponible en la malla.",
  },
  {
    id: "land-capability",
    index: 11,
    label: "Capacidad terrestre",
    folderId: "risk-planning",
    computeMode: "backend",
    description: "Indice compuesto para aptitud de uso.",
  },
  {
    id: "erosion-risk",
    index: 12,
    label: "Riesgo de erosion",
    folderId: "risk-planning",
    computeMode: "backend",
    description: "Riesgo por pendiente, flujo y posicion topografica.",
  },
  {
    id: "flow-velocity",
    index: 13,
    label: "Velocidad de flujo",
    folderId: "hydrology",
    computeMode: "backend",
    description: "Estimacion hidrologica de velocidad superficial.",
  },
  {
    id: "drainage",
    index: 14,
    label: "Drenaje",
    folderId: "hydrology",
    computeMode: "backend",
    description: "Red de drenaje y concentracion de escurrimiento.",
  },
  {
    id: "twi",
    index: 15,
    label: "TWI",
    folderId: "hydrology",
    computeMode: "backend",
    description: "Topographic Wetness Index.",
  },
  {
    id: "valley-depth",
    index: 16,
    label: "Profundidad del valle",
    folderId: "hydrology",
    computeMode: "backend",
    description: "Distancia relativa a crestas y fondos de valle.",
  },
  {
    id: "viewshed",
    index: 17,
    label: "Cobertura de vista",
    folderId: "risk-planning",
    computeMode: "backend",
    description: "Visibilidad preliminar desde puntos altos.",
  },
  {
    id: "flooding",
    index: 18,
    label: "Inundaciones",
    folderId: "hydrology",
    computeMode: "backend",
    description: "Zonas bajas y planas con potencial de acumulacion.",
  },
  {
    id: "watersheds",
    index: 19,
    label: "Cuencas hidrograficas",
    folderId: "hydrology",
    computeMode: "backend",
    description: "Segmentacion de cuencas y subcuencas.",
  },
  {
    id: "wind-exposure",
    index: 20,
    label: "Exposicion al viento",
    folderId: "risk-planning",
    computeMode: "backend",
    description: "Exposicion por orientacion, altura y borde.",
  },
];

export function getTerrainAnalysisLayer(layerId: string) {
  return terrainAnalysisLayers.find((layer) => layer.id === layerId);
}
