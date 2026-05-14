# V7 - Legacy Grasshopper Result Adapter

## Principio

Grasshopper queda cerrado. No se modifica su programacion ni se pide un contrato nuevo.

La app debe adaptarse a la respuesta existente de Rhino Compute y copiar sus salidas a los mismos campos que usa el terreno demo.

## Entradas usadas

La definicion existente declara estas entradas:

- `projectId`
- `projectName`
- `projectDescription`
- `userId`
- `coordinatesCenter`
- `coordinates`
- `uso`
- `tipo`
- `humedad`
- `infiltracion`
- `almacenamiento`
- `Segmentacion`
- `Diseño`
- `DatosXR`

## Salidas legacy mapeadas a Redux

- `lines` -> `lineas`
- `mesh` -> `malla`
- `hillsides` -> `laderas`
- `soils` -> `suelos`
- `matrix` -> `matriz`
- `ARjson` -> `arJson`
- `Genjson` -> `genJson`
- `Lineasjson` -> `lineasJson`
- `objectsjson` -> `objectsJson`
- `lineasazulesjson` -> `lineasAzulesJson`
- `lineasamarillasjson` -> `lineasAmarillasJson`
- `listasjson` -> `listasJson`

## Flujo UI

En `/particles`:

1. `Probar ida-vuelta Rhino` valida conectividad.
2. `Procesar con Grasshopper` llama `/io`, toma `CacheKey`, llama `/grasshopper` con el poligono guardado y aplica las salidas legacy.
3. `Cargar terreno demo` sigue disponible como baseline manual.

## Nota sobre peso

La respuesta de `/grasshopper` puede ser pesada. El adaptador no la sube a GitHub ni la guarda en archivos; solo la aplica en memoria de Redux durante la sesion.
