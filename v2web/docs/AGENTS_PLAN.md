# V2WEB Agent Plan

Este plan define ownership operativo para V2WEB con una capa formal de
orquestador. Es documentacion de trabajo para construir V2WEB en paralelo; V1
permanece intacto y solo sirve como referencia funcional.

## Modelo De Orquestacion

V2WEB se organiza como un Director Orchestrator que coordina subagentes por
dominio. El Director recibe objetivos del usuario, crea planes, divide tareas,
asigna capacidades, registra eventos y valida que cada ejecucion respete
contratos, permisos y side effects.

La unidad operativa no es un componente suelto. Es una cadena trazable:

```txt
user intent
  -> OrchestratorPlan
  -> OrchestratorTask
  -> TaskAssignment
  -> ToolInvocation or JobManifest
  -> ProjectArtifact or RepresentationManifest
  -> reviewed response
```

Contratos base:

- `AgentManifest`
- `AgentCapability`
- `OrchestratorPlan`
- `OrchestratorTask`
- `TaskDependency`
- `TaskAssignment`
- `AgentMessage`
- `AgentEvent`
- `ToolInvocation`
- `ToolManifest`
- `RhinoAppManifest`
- `RepresentationManifest`
- `JobManifest`
- `ProjectArtifact`
- `TerrainScene`

## Director Agent

Owns:

- arquitectura de runtime y orden de integracion
- criterios de aceptacion por milestone
- planificacion multiagente y handoffs
- politicas de permisos, side effects y aprobacion humana
- decisiones de fallback cuando faltan runtime, datos o permisos
- integracion entre contracts, backend, scene tools, Rhino apps y
  representaciones

Files:

- `v2web/docs/ARCHITECTURE.md`
- `v2web/docs/ORCHESTRATOR_RUNTIME.md`
- `v2web/docs/AGENTS_PLAN.md`
- contratos de orquestacion en `v2web/packages/core/src/orchestration.ts`

No owns:

- implementacion interna de V1
- llamadas UI directas a Rhino Compute
- mutaciones generativas fuera de manifests o view specs

## Core Contracts Agent

Owns:

- `v2web/packages/core`
- identidad, audit stamp y tipos JSON
- project metadata y artifact contracts
- scene, terrain mesh, features y layers
- job manifests, job status y runtime types
- tool, representation, Rhino app y orchestration contracts
- compatibilidad de schemas entre subagentes

Contratos obligatorios:

- todo id persistente usa `EntityId`
- toda entidad editable usa metadata auditable cuando aplique
- todo output persistente usa `ProjectArtifact`
- todo job pesado usa `JobManifest`
- toda accion ejecutable declara input/output schema

## Backend Agent

Owns:

- `v2web/server/local-backend`
- endpoints `/health`, `/jobs`, `/jobs/:id`
- job store local y futura persistencia de proyectos/artifacts
- ejecucion de jobs backend
- integracion futura con OpenAPI
- control de estado `queued`, `running`, `waiting_external`, `succeeded`,
  `failed` y `cancelled`

Contratos:

- el backend acepta jobs, no blobs de UI sin schema
- cada resultado persistente se materializa como artifact
- eventos de job deben ser legibles por timeline frontend
- errores deben incluir codigo y mensaje seguro
- no se exponen secretos ni rutas internas innecesarias al frontend

## Rhino Agent

Owns:

- `v2web/packages/rhino`
- Rhino app manifests
- definition registry
- validacion de inputs y outputs Grasshopper
- `legacyOutputMap`
- adaptador backend futuro para Rhino Compute
- control de timeout, cache, concurrencia y plugins requeridos

Contrato Rhino:

- V2WEB no llama Rhino Compute desde UI
- toda ejecucion Rhino crea job `rhino-compute`
- cada definicion tiene `RhinoDefinitionRef`
- outputs legacy se normalizan antes de entrar a escena o artifacts
- artifacts generados registran lineage con `rhinoAppId`

Rhino app inicial:

- `rhino.terrain-base.beta3`

## Scene Agent

Owns:

- futuro `v2web/packages/scene`
- carga de mallas desde `TerrainMeshRef`
- picking, raycast y transformaciones
- renderers para features y layers
- seleccion, camara y overlays
- sincronizacion entre scene state y tool state

Contratos:

- la escena consume artifact refs, no arrays pesados globales
- features soportadas: point, polygon, path, object, annotation
- layers soportadas: mesh-scalar, vector, raster, object-overlay
- cambios de escena validan lock, ownership, schema y permisos
- herramientas realtime pueden actualizar escena pero no persistir outputs
  pesados sin backend

## Tool Agent

Owns:

- `v2web/packages/tools`
- manifests de herramientas
- separacion frontend/backend/rhino/generative
- contratos de tool panels
- permisos y side effects de cada tool
- mapping entre tool, renderer, jobKind y runtime

Familias:

- `frontend`: interaccion realtime de escena o proyecto
- `backend`: analisis y persistencia por job
- `rhino`: ejecucion delegada a Rhino app
- `generative`: tools que producen manifests, view specs o artifacts seguros

Tools iniciales:

- `terrain.selection.polygon-editor`
- `terrain.interaction.point-marker`
- `terrain.analysis.drainage`

Regla de ownership:

- una tool solo puede modificar targets declarados en `sideEffects`
- una tool solo puede pedir permisos declarados en `permissions`
- si `realtime` es `false`, debe existir ruta de job

## Representation Agent

Owns:

- `v2web/packages/representations`
- report/chart/tooltip/table/dashboard manifests
- view specs seguros para renderers permitidos
- allowed actions por representacion
- registro de origen humano, sistema o LLM
- conversion de artifacts y project facts a vistas entendibles

Renderers actuales:

- `markdown-report`
- `echarts-chart`
- `data-table`
- `terrain-tooltip`
- `three-annotation`
- `dashboard-panel`

Representaciones iniciales:

- `representation.project.summary-report`
- `representation.analysis.scalar-chart`
- `representation.terrain.tooltip`

Reglas:

- una representacion no ejecuta codigo libre
- una representacion generativa no muta la app directamente
- `allowedActions` limita acciones disparables desde la vista
- `viewSpecSchema` valida la salida renderizable

## Orchestration Runtime Agent

Owns:

- lifecycle de planes, tareas, dependencias y assignments
- bus de mensajes entre agentes
- event log para timeline y debug
- normalizacion de `ToolInvocation`
- correlacion entre task, job, artifact y response final
- politica de retries, cancelacion y bloqueo

Estados relevantes:

- plan: `draft`, `blocked`, `partially_succeeded` o estados de job
- task: `draft`, `blocked`, `skipped` o estados de job
- assignment: `proposed`, `accepted`, `released` o estados de job

Este agente puede ser implementado en backend, LLM controlado o sistema, pero
siempre debe persistir eventos suficientes para auditoria.

## Frontend Shell Agent

Owns:

- futuro `v2web/apps/web`
- auth/session provider
- project router
- terrain scene host
- tool panel host
- representation panel host
- job timeline
- surface de preguntas/aprobaciones humanas

Contratos:

- no llama Rhino Compute directo
- no guarda arrays pesados en estado global
- monta tools y representaciones desde manifests
- muestra estado de plan/job sin inventar progreso
- envia contexto minimo suficiente al Director

## Migration Agent

Owns compatibilidad con V1 como referencia:

- demo assets
- comportamiento Auth0/local session
- project save/recovery
- Rhino beta3 output mapping
- terrain viewer y selection flow existentes
- 20 analysis layers
- outputs legacy: Genjson, Lineasjson, objectsjson y equivalentes mapeados

Reglas:

- no reescribir V1 in place para cumplir V2WEB
- extraer comportamiento gradualmente hacia contracts V2WEB
- mantener V1 como fuente funcional hasta que V2WEB tenga reemplazo aceptado
- documentar diferencias cuando V2WEB no alcance paridad

## Ownership De Archivos

Ownership principal:

- Core Contracts Agent: `v2web/packages/core/**`
- Backend Agent: `v2web/server/local-backend/**`
- Rhino Agent: `v2web/packages/rhino/**`
- Tool Agent: `v2web/packages/tools/**`
- Representation Agent: `v2web/packages/representations/**`
- Scene Agent: futuro `v2web/packages/scene/**`
- Frontend Shell Agent: `v2web/apps/web/**`
- Director Agent: `v2web/docs/**` y decisiones cross-domain

Reglas cross-domain:

- cambios de contrato requieren coordinacion con Director
- cambios en manifests deben mantener schemas y permisos explicitos
- backend no debe acoplarse a componentes UI
- frontend no debe conocer detalles internos de Rhino Compute
- representaciones no deben asumir storage directo fuera de artifact refs

## V2WEB-0 Acceptance

- V2WEB existe en carpeta separada.
- V1 build scope permanece sin tocar.
- Core contracts compilan dentro de V2WEB.
- Existe contrato formal de orquestacion.
- Registries incluyen ejemplos iniciales de tools, Rhino apps y
  representaciones.
- Backend expone `/health`, `/jobs`, `/jobs/:id`.
- Runtime doc explica Director, subagentes, flujo usuario, backend, Rhino,
  herramientas, representaciones, seguridad y limites.
- Architecture docs explican boundaries de migracion.
- Cada nuevo modulo declara manifest, schemas, permisos, side effects y runtime
  owner.
