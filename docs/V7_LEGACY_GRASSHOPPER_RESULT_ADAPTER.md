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

1. Si existe una solicitud guardada desde `/analisis`, la vista llama `/io`, toma `CacheKey`, llama `/grasshopper` con el poligono guardado y aplica las salidas legacy automaticamente.
2. El enlace `Terreno Demo` navega a `/particles?demo=1` y carga el demo comprimido desde `public/demo`.
3. El visor es el mismo para ambos usos: terreno procesado por Grasshopper o terreno demo.

## Ajustes de compatibilidad

- El poligono se cierra antes de enviarse a Grasshopper.
- El solve usa `pointer` devuelto por `/io` y no envia `filename`, igual que el cuerpo legacy validado.
- Los campos `projectId`, `projectName`, `projectDescription` y `userId` se envian como `"1"`, igual que produccion legacy; el cluster convierte esos textos a numero internamente.
- Si `/grasshopper` responde error, la UI muestra el inicio del cuerpo de respuesta para poder diagnosticar desde AI Studio.

## Nota sobre peso

La respuesta de `/grasshopper` puede ser pesada. El adaptador no la sube a GitHub ni la guarda en archivos; solo la aplica en memoria de Redux durante la sesion.

## Archivo Grasshopper

El payload activo que se envia a `/io` vive en:

- `src/components/rhinoCompute/io_req.json`

Ese JSON declara internamente `filename: "beta3.gh"` y contiene la definicion Grasshopper serializada en `algo`.

En el frontend original se encontraron archivos `.gh` editables en:

- `C:\Gravitacional\Aplicación\Frontend-Gravitacional\src\assets\beta23.gh`
- `C:\Gravitacional\Aplicación\Frontend-Gravitacional\src\assets\2222terreno.gh`
- `C:\Gravitacional\Aplicación\Frontend-Gravitacional\src\assets\definition.gh`

El binario embebido como `beta3.gh` no coincide por hash con esos candidatos, asi que para modificar exactamente la definicion activa hay que abrir/exportar el `beta3.gh` original o regenerar `io_req.json` desde Rhino/Hops despues de editar la definicion correcta.
