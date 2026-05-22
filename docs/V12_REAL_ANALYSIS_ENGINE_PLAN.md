# V12 - Plan Para Motor Real De 20 Capas De Analisis

V11 dejo listo el arbol independiente de 20 capas y un backend stub para las capas pesadas. V12 debe reemplazar gradualmente esos stubs por calculos reales sin tocar el flujo estable de Auth0, mapas, guardado de proyectos, Rhino/Grasshopper ni el visor demo.

## Principio Base

El insumo principal de Gravweb es una malla 3D, no un raster DEM clasico.

La arquitectura correcta es:

1. Mantener una sola malla base en el visor.
2. Calcular atributos livianos por vertice/cara en frontend.
3. Calcular capas pesadas en backend local.
4. Guardar resultados por proyecto como artefactos comprimidos.
5. Enviar al frontend un manifest liviano y cargar artefactos solo bajo demanda.

## Capas Ya Resueltas En Frontend

Estas capas se derivan de `currentMesh`:

- Contornos
- Sombra de colina
- Elevacion
- Aspecto
- Alivio
- Poliedrico
- Pendiente
- Rangos de pendiente
- Formas del relieve
- Morfometria

## Capas Que Deben Pasar A Motor Real Backend

- Capacidad terrestre
- Riesgo de erosion
- Velocidad de flujo
- Drenaje
- TWI
- Profundidad del valle
- Cobertura de vista
- Inundaciones
- Cuencas hidrograficas
- Exposicion al viento

## Motor Recomendado

### Fase 1 - Node puro, sin dependencias GIS pesadas

Objetivo: probar ida-vuelta real y persistencia con artefactos pequenos.

- Convertir malla a grilla regular en backend.
- Calcular pendientes, direccion de flujo aproximada y acumulacion simple.
- Devolver `Float32Array` o JSON compacto gzip para una capa.

Capas iniciales:

- Drenaje
- TWI simplificado
- Riesgo de erosion preliminar

### Fase 2 - WhiteboxTools

Objetivo: motor hidrologico robusto y relativamente facil de instalar.

Capas:

- Drenaje
- TWI
- Cuencas hidrograficas
- Profundidad del valle
- Inundaciones preliminares

### Fase 3 - GDAL / GRASS GIS

Objetivo: produccion GIS completa.

Usos:

- GDAL `gdaldem`: slope, aspect, hillshade, TRI, TPI, roughness, color-relief.
- GRASS `r.watershed`: flow accumulation, drainage direction, basins, wetness indices.

Referencias:

- GDAL gdaldem: https://gdal.org/en/stable/programs/gdaldem.html
- GRASS r.watershed: https://grass.osgeo.org/grass-stable/manuals/r.watershed.html
- WhiteboxTools: https://www.whiteboxgeo.com/manual/wbt_book/intro.html

## Contrato Backend

V11 ya agrega:

```http
GET /project/:projectId/analysis-layers
POST /project/:projectId/analysis-layers/:layerId/process
GET /project/:projectId/analysis-layers/:layerId/artifact
```

El endpoint `POST /project/:projectId/analysis-layers/:layerId/process` debe seguir existiendo, pero el payload debe aceptar referencias a insumos reales:

```ts
{
  processingRequestId?: string;
  meshSummary?: Record<string, unknown>;
  input?: {
    meshArtifactUrl?: string;
    meshArtifactId?: string;
    meshFormat?: "indexed-buffer-geometry" | "glb" | "obj" | "ply";
    demArtifactId?: string;
    forceRasterize?: boolean;
  };
  options?: {
    resolution?: number;
    crs?: string;
    extent?: [number, number, number, number];
    noData?: number;
    observerPoints?: Array<{ x: number; y: number; z?: number }>;
    rainfallMmH?: number;
    windDirectionDeg?: number;
    windDirectionsDeg?: number[];
    thresholds?: Record<string, number>;
  };
}
```

La respuesta puede ser inmediata con manifest. Si el calculo toma mas tiempo, usar `queued` o `processing` y actualizar el manifest cuando termine:

```ts
{
  ok: true;
  jobId: string;
  manifest: {
    id: string;
    projectId: string;
    layerId: string;
    status: "queued" | "processing" | "ready" | "failed";
    source: "backend";
    createdAt: string;
    updatedAt: string;
    artifactUrl: string;
    summary: {
      engine: "gravweb-terrain-v12";
      inputHash: string;
      demArtifactId: string;
      resolution: number;
      units: "meters";
      rasterized: boolean;
      stats: { min: number; max: number; mean?: number };
      outputs: {
        raster?: string;
        vectors?: string;
        meshVertexValues?: string;
        legend?: string;
      };
    };
    error?: string;
  };
}
```

## Pipeline Malla A DEM

La malla 3D es el insumo maestro, pero las capas pesadas deben operar sobre un DEM cacheado:

1. Recibir o localizar la malla real del proyecto.
2. Normalizar unidades y ejes: `Z` como elevacion, `X/Y` como plano.
3. Rasterizar triangulos a DEM `float32` con `bbox`, `cellSize` y `noData`.
4. Generar derivados comunes una sola vez: `slope`, `aspect`, `curvature`, `filledDem`, `flowDirection`, `flowAccumulation`, `depressionMask`.
5. Guardar cache por `inputHash + resolution`.
6. Cada capa pesada consume estos derivados, no recalcula la malla desde cero.

## Artefacto V12 Recomendado

```ts
{
  schemaVersion: "terrain-analysis-artifact/v12";
  projectId: string;
  layerId: string;
  grid: {
    width: number;
    height: number;
    bbox: [number, number, number, number];
    cellSize: number;
    noData: number;
  };
  bands: [
    {
      name: "value";
      type: "float32" | "uint16" | "uint8";
      encoding: "base64-gzip" | "array-json";
      min: number;
      max: number;
      data: string | number[];
    }
  ];
  vectors?: GeoJSON.FeatureCollection;
  meshMapping?: {
    strategy: "sample-raster-at-vertex";
    vertexValuesUrl?: string;
  };
  legend: Array<{ value?: number; min?: number; max?: number; color: string; label: string }>;
  diagnostics: Record<string, unknown>;
}
```

El frontend no debe renderizar todo el raster el primer dia. Puede empezar pintando vertex colors desde `meshVertexValues` o una muestra del raster.

## Administracion De Carpetas

Mantener este arbol en frontend:

- Relieve
- Pendiente y forma
- Hidrologia
- Riesgo y planificacion

Cada capa debe tener:

- `id`
- `folderId`
- `computeMode`
- `status`
- `manifest`
- `artifactUrl`
- `legend`
- `renderer`

## Orden Recomendado Por Dependencias

1. Drenaje: valida DEM fill, direccion/acumulacion de flujo y vectorizacion.
2. Cuencas hidrograficas: valida que la hidrologia no este invertida.
3. TWI: usa acumulacion especifica y pendiente.
4. Velocidad de flujo: aproximacion inicial con Manning simplificado.
5. Inundaciones: indice de baja pendiente, baja altura relativa, alta acumulacion y depresiones.
6. Profundidad del valle: ideal con WhiteboxTools; alternativa por distancia vertical a red de drenaje.
7. Riesgo de erosion: pendiente, acumulacion/velocidad, curvatura y cobertura si existe.
8. Capacidad terrestre: sintesis de pendiente, inundacion, erosion y profundidad.
9. Exposicion al viento: aspecto, elevacion relativa y direccion de viento.
10. Cobertura de vista: ultima por costo computacional; requiere puntos observadores y cache fuerte.

## Reglas De Performance

- No guardar arrays pesados en Redux.
- No cargar artefactos al abrir `/particles`.
- Cargar una capa backend solo cuando el usuario la activa.
- Reutilizar una sola malla base.
- Cachear por `projectId + layerId + meshHash + options`.
- Cancelar o ignorar resultados antiguos si el usuario cambia de proyecto.
- Preferir `Float32Array`, `Uint8Array`, `.gz` o `.br` sobre JSON grande.

## Orden De Implementacion

1. Crear `meshRasterizer` en backend local.
2. Generar un `meshHash` liviano desde vertices/caras.
3. Agregar almacenamiento de insumo real: malla exportada o DEM precomputado por proyecto.
4. Implementar `prepareTerrainDataset(projectId, mesh, options)`.
5. Implementar `drainage` real simplificado como capa piloto.
6. Implementar `twi` real simplificado.
7. Implementar `erosion-risk` preliminar.
8. Extender frontend para cargar artifact real y pintar scalar field.
9. Agregar cache por capa.
10. Integrar WhiteboxTools para hidrologia robusta.
11. Integrar GDAL/GRASS solo si hace falta precision GIS completa.
12. Medir peso, tiempo y memoria por capa.

## Criterio De Listo

Una capa pesada esta lista cuando:

1. El usuario presiona `Procesar`.
2. El backend guarda artefacto comprimido.
3. El manifest queda asociado al proyecto.
4. El frontend marca la capa como `Listo`.
5. Al activar la capa, la malla se repinta sin recalcular.
6. Al reabrir el proyecto, la capa sigue disponible.
