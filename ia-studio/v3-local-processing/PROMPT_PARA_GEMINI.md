# Prompt Para Gemini En AI Studio - V3

Estamos avanzando la migracion controlada de Gravweb. La V2 ya fue validada:

- `/analisis` carga la pantalla de seleccion de terreno.
- `/particles` carga el terreno demo con lazy loading.
- Build, typecheck y compile en AI Studio pasan correctamente.
- No se deben subir `node_modules`, `.git`, `dist`, zips, logs ni secretos.

## Objetivo V3

Conectar de forma minima y segura la seleccion de terreno con un contrato de procesamiento local.

No queremos implementar Rhino ni procesamiento real todavia. Primero necesitamos dejar estable el flujo:

1. El usuario selecciona o carga un poligono en `/analisis`.
2. La app guarda un `ProcessingRequest` limpio en estado/localStorage/sessionStorage.
3. La accion "Procesar el terreno" navega a `/particles`.
4. `/particles` lee ese request y muestra:
   - datos del terreno seleccionado,
   - estado del procesamiento,
   - y, si no hay backend local disponible, carga el terreno demo actual.

## Alcance Permitido

Puedes modificar solamente:

- `src/components/maps/MapaPoligono.tsx`
- `src/pages/TerrenoDemoPage.tsx`
- `src/services/demoProjectLoader.ts`
- `src/services/`
- `src/types/`
- `src/App.tsx` solo si es estrictamente necesario
- `README.md`
- `docs/`

No migres pantallas nuevas.
No agregues autenticacion.
No agregues Gemini.
No agregues secretos.
No agregues datos pesados nuevos.
No elimines el fallback actual.

## Contrato Recomendado

Crear un tipo parecido a este:

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

Crear un servicio pequeño:

```ts
saveProcessingRequest(request)
loadProcessingRequest()
clearProcessingRequest()
```

Puede usar `sessionStorage` por ahora.

## Backend Local Futuro

Preparar, sin consumir aun de forma obligatoria, una variable publica:

```bash
VITE_LOCAL_PROCESSOR_URL=
```

Si existe en el futuro, `/particles` podra llamar al backend local.
Si no existe, debe mantener el comportamiento actual: cargar demo desde `public/demo`.

## Reglas De Seguridad

- Solo usar variables publicas `VITE_*`.
- Nunca exponer claves privadas.
- Nunca hardcodear API keys.
- No subir `.env`.
- No subir `node_modules`.
- No subir `dist`.
- No romper el modo fallback de AI Studio sin Google Maps.

## Verificacion Esperada

Al terminar, ejecutar:

```bash
npm run build
npm run lint
npm audit
```

Todo debe terminar con exit code 0.

## Resultado Esperado

Entrega una V3 pequena donde el flujo ya tenga memoria:

- `/analisis` crea o actualiza un request de procesamiento.
- `/particles` puede mostrar que viene desde una seleccion real o desde demo.
- Si no hay request, carga el demo como ahora.
- Documenta brevemente el contrato en `docs/`.
