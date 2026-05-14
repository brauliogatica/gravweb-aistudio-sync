# V3 Local Processing Contract

V3 debe conectar la seleccion de terreno con un contrato estable antes de intentar
procesamiento real con Rhino, Three.js avanzado o un backend local.

## Flujo

1. `/analisis` genera un `ProcessingRequest` desde poligono manual, poligono demo o archivo importado.
2. El request se guarda temporalmente en `sessionStorage`.
3. La app navega a `/particles`.
4. `/particles` intenta leer el request.
5. Si existe, muestra contexto del terreno seleccionado y prepara la carga demo.
6. Si no existe, mantiene el comportamiento actual de terreno demo.

## Tipo Base

```ts
export interface TerrainPoint {
  lat: number;
  lng: number;
}

export interface ProcessingRequest {
  id: string;
  source: "manual-polygon" | "demo-polygon" | "imported-file";
  createdAt: string;
  polygon: TerrainPoint[];
  centroid?: TerrainPoint;
  areaM2?: number;
  status: "draft" | "queued" | "processing" | "demo-ready" | "failed";
}
```

## Servicio Base

```ts
saveProcessingRequest(request)
loadProcessingRequest()
clearProcessingRequest()
```

## Seguridad

- El frontend solo puede usar variables publicas `VITE_*`.
- No se deben persistir secretos en storage ni codigo fuente.
- El procesamiento real debe vivir detras de un servicio local o backend.
- `VITE_LOCAL_PROCESSOR_URL` queda reservado para una iteracion posterior.
