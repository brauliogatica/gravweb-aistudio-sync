# Prompt Para AI Studio - Sincronizar V11

Sincroniza la app Gravweb desde la rama `main` del repositorio:

```text
https://github.com/brauliogatica/gravweb-aistudio-sync
```

Commit exacto esperado:

```text
30234b40d7d2435e6a46b9e9bfc389a212bb5487
```

Tag de respaldo:

```text
v11-analysis-layer-manager
```

Nota importante: el tag `v11-analysis-layer-manager` es anotado. Si Git muestra otro hash para el objeto tag, usar igualmente el commit real `30234b40d7d2435e6a46b9e9bfc389a212bb5487`.

## Objetivo

Actualizar Gravweb a V11 sin romper los flujos que ya funcionan:

- Auth0 / login / logout
- Google Maps en `/analisis`
- Flujo `/analisis` -> `/particles`
- Rhino Compute / Grasshopper legacy
- Terreno demo
- Guardado y recuperacion de proyectos por usuario
- Backend local en `VITE_API_BASE_URL`

V11 agrega:

- Arbol independiente de 20 capas de analisis en `/particles`.
- 10 capas derivadas de la malla 3D, activables en frontend.
- 10 capas pesadas con boton `Procesar`.
- Endpoint backend local para manifest de capas pesadas.
- Documento `docs/V11_ANALYSIS_LAYER_MANAGER.md`.
- Plan posterior `docs/V12_REAL_ANALYSIS_ENGINE_PLAN.md`.

## Archivos Clave A Verificar

- `src/components/waterParticles/AnalysisLayersPanel.tsx`
- `src/components/waterParticles/analysisLayerRegistry.ts`
- `src/components/waterParticles/WaterParticle.tsx`
- `src/components/waterParticles/style.css`
- `src/services/projectAnalysisService.ts`
- `src/types/types.ts`
- `local-backend/server.mjs`
- `docs/V11_ANALYSIS_LAYER_MANAGER.md`
- `docs/V12_REAL_ANALYSIS_ENGINE_PLAN.md`

## Variables De Entorno Esperadas

```bash
VITE_API_BASE_URL=<backend local o tunel cloudflare del backend>
VITE_RHINO_COMPUTE_URL=<tunel cloudflare de Rhino Compute>
VITE_RHINO_COMPUTE_TIMEOUT_MS=180000
VITE_MAX_AREA_HECTARES=100
VITE_GOOGLE_MAPS_API_KEY=<key configurada en AI Studio>
VITE_AUTH0_DOMAIN=dev-cjqveyhkp561bx8d.us.auth0.com
VITE_AUTH0_CLIENT_ID=TXh13oNxc7PPup241n4c2Vt7gYqUDR2Y
```

No reemplazar `VITE_API_BASE_URL` ni `VITE_RHINO_COMPUTE_URL` por `localhost` dentro de AI Studio. En AI Studio deben ser URLs HTTPS de tuneles.

## No Modificar

- `src/services/rhinoComputeService.ts`
- `src/services/grasshopperProjectAdapter.ts`
- flujo Auth0
- flujo `/analisis` -> `/particles`
- carga de terreno demo
- estructura legacy `genJson`, `lineasJson`, `objectsJson`, `arJson`

## Ejecutar

```bash
npm install
npm run lint
npm run build
npm audit
```

## Pruebas Manuales

1. Abrir `/login` y autenticar.
2. Entrar a `/analisis`.
3. Seleccionar o dibujar terreno.
4. Procesar terreno y confirmar navegacion a `/particles`.
5. Ver que aparece el nuevo arbol `Capas de analisis`.
6. Activar capas frontend: Elevacion, Pendiente, Aspecto, Alivio, Contornos.
7. Guardar el terreno.
8. Probar una capa backend con boton `Procesar`.
9. Confirmar que la capa pasa a `Listo` y se activa visualmente.
10. Confirmar que el boton `Terreno Demo` sigue disponible.

## Advertencias

- Las capas backend de V11 crean manifest/artefacto liviano. El calculo GIS real queda planificado para V12.
- Si una capa backend pide guardar el terreno primero, guardar el proyecto y repetir.
- No usar `degit --force` si existen cambios locales no subidos.
- No sustituir Auth0 por auth local. La auth local es fallback/desarrollo; Auth0 productivo sigue vivo.
- No mover `AnalysisLayersPanel` dentro de Redux; el estado de capas es UI/local y los resultados pesados van como manifest backend.
- No borrar los fallbacks de Google Maps: AI Studio debe poder abrir `/analisis` aunque no tenga key.
- No tocar el contrato Grasshopper: outputs como `Genjson`, `Lineasjson`, `objectsjson`, etc. siguen mapeando en `grasshopperProjectAdapter.ts`.
