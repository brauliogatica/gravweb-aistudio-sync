# V2WEB Orchestrator Runtime

Este documento define como opera V2WEB cuando se ejecuta con una capa formal
de orquestador y subagentes. Es documentacion operativa para V2WEB; V1 sigue
siendo la referencia funcional y no debe modificarse para cumplir este runtime.

## Objetivo

El runtime V2WEB debe permitir que una solicitud del usuario se transforme en
un plan verificable, dividido en tareas y ejecutado por agentes de dominio. El
usuario no invoca Rhino Compute, jobs pesados, herramientas de escena ni
representaciones generativas de forma directa. El usuario expresa una intencion;
el orquestador decide el camino seguro y deja trazabilidad.

Principios:

- El orquestador coordina, no reemplaza los contratos de modulo.
- Cada accion ejecutable se declara mediante manifest y schema.
- Cada operacion pesada se ejecuta como job.
- Cada salida persistente se guarda como artifact con metadata y lineage.
- Las representaciones generativas producen view specs o manifests seguros.
- La UI nunca llama Rhino Compute directamente.

## Roles Runtime

### Usuario

Define la intencion: seleccionar terreno, editar geometria, pedir analisis,
generar una vista, revisar resultados o exportar informacion. Puede aprobar,
rechazar o corregir pasos cuando una tarea requiere decision humana.

### Frontend Shell

Hospeda auth, rutas, estado de proyecto, escena, panel de herramientas,
representaciones y timeline de jobs. No resuelve operaciones pesadas ni conoce
detalles internos de Rhino/Grasshopper.

### Director Orchestrator

Es el agente raiz. Recibe el objetivo, crea un `OrchestratorPlan`, divide el
trabajo en `OrchestratorTask`, asigna tareas a subagentes, valida dependencias
y decide cuando una respuesta esta lista para volver al usuario.

Responsabilidades:

- Interpretar objetivo, contexto de proyecto y estado de escena.
- Elegir herramientas, Rhino apps y representaciones por manifest.
- Crear tareas con schemas, dependencias y criterios de salida.
- Mantener trazabilidad con messages, events, assignments y job ids.
- Solicitar aprobacion humana cuando una accion es destructiva, ambigua o
  fuera de permisos.
- Detener o degradar el plan si faltan datos, permisos o runtime disponible.

### Subagentes

Los subagentes ejecutan dominios acotados. No deben modificar areas fuera de su
ownership ni saltarse contratos del Director.

- Planner: transforma objetivos en tareas pequenas y dependencias.
- Researcher: recupera contexto de proyecto, artifacts y metadata.
- Terrain Analyst: interpreta malla, capas, features y resultados de analisis.
- Geometry Author: propone o edita puntos, poligonos, paths, objetos y
  anotaciones.
- Rhino Operator: prepara inputs, invoca Rhino apps via backend y valida
  outputs legacy.
- Tool Operator: ejecuta tools frontend/backend/rhino/generative segun
  manifest.
- Representation Author: crea reportes, charts, tooltips, anotaciones o
  dashboards mediante view specs seguros.
- Reviewer: verifica schemas, permisos, side effects, lineage y respuesta final.
- Observer: registra eventos, progreso y estado para UI/timeline.

## Flujo De Usuario

1. El usuario formula una intencion en la UI.
2. El Frontend Shell adjunta contexto minimo: user id, project id, escena activa,
   selected feature ids, tool activa y artifacts relevantes.
3. El Director crea un plan con estado `draft` o `queued`.
4. El Director pregunta al usuario si falta informacion esencial o si una accion
   requiere aprobacion.
5. Los subagentes ejecutan tareas y reportan resultados como mensajes, artifacts
   o jobs.
6. La UI muestra progreso desde events, job status y artifacts disponibles.
7. El Reviewer valida que la salida cumpla schemas y permisos.
8. El Director entrega al usuario una respuesta accionable: escena actualizada,
   artifact, representacion, error recuperable o solicitud de decision.

## Flujo Backend

El backend local es el punto de entrada para jobs y persistencia de runtime.
Actualmente expone:

- `GET /health`
- `GET /jobs`
- `POST /jobs`
- `GET /jobs/:id`

Flujo esperado:

1. El Director o Tool Operator crea una `ToolInvocation`.
2. Si la accion es pesada o externa, se crea un `JobManifest`.
3. El backend acepta el job en estado `queued`.
4. El runtime responsable lo mueve a `running`, `waiting_external`,
   `succeeded`, `failed` o `cancelled`.
5. Los resultados persistentes se registran como `ProjectArtifact`.
6. El artifact declara `kind`, `mediaType`, `storage`, `sha256` cuando aplique y
   `lineage` con job, tool, Rhino app e inputs.
7. El Director consume output y decide el siguiente paso del plan.

Runtimes de job:

- `backend`: analisis, persistencia, conversiones y operaciones de servidor.
- `rhino-compute`: ejecucion de Grasshopper mediante adaptador backend.
- `frontend-worker`: tareas locales no bloqueantes que pueden correr en browser.
- `llm`: generacion controlada de planes, view specs, reportes o manifests.

## Relacion Con Rhino/Grasshopper

Rhino/Grasshopper se expone como Rhino App Module. En V2WEB no se llama
directamente desde componentes UI. El flujo correcto es:

1. Una tool o tarea solicita una Rhino app por `RhinoAppManifest`.
2. El Rhino Operator valida schema de input, definicion, version, timeout,
   plugins requeridos, cache y concurrencia.
3. El backend crea un job `rhino-compute`.
4. El adaptador Rhino Compute resuelve la definicion Grasshopper.
5. El output se normaliza al contrato V2WEB.
6. Si el output viene de V1 legacy, se aplica `legacyOutputMap`.
7. Mallas, JSON legacy, reportes o logs se guardan como artifacts.
8. La escena y las representaciones consumen artifacts, no blobs sueltos.

El manifest inicial `rhino.terrain-base.beta3` representa la compatibilidad con
`beta3.gh`. Su fuente legacy sigue siendo referencia, no codigo a reescribir en
V1.

## Herramientas Frontend

Las herramientas frontend son interacciones inmediatas sobre escena o proyecto.
Ejemplos actuales:

- `terrain.selection.polygon-editor`
- `terrain.interaction.point-marker`

Reglas:

- Deben declarar `ToolManifest`.
- Deben declarar `family`, `stage`, `realtime`, `requiresProject` y
  `requiresMesh`.
- Deben exponer input/output schemas.
- Deben declarar permisos y side effects.
- Pueden actualizar features, seleccion, camara o overlays de escena.
- No deben escribir artifacts pesados sin pasar por backend.
- No deben llamar Rhino Compute ni APIs externas directamente.

## Herramientas Backend

Las herramientas backend ejecutan acciones no realtime o persistentes. Ejemplo
actual:

- `terrain.analysis.drainage`

Reglas:

- Toda ejecucion crea job.
- El input debe ser JSON validable y referenciar artifacts por id.
- La salida persistente debe ser artifact.
- El job debe reportar eventos de progreso comprensibles para UI.
- El Director debe poder reintentar, cancelar o marcar error recuperable.

## Scene Tools

La escena V2WEB representa terreno, features, layers, seleccion y camara
mediante `TerrainScene`.

Elementos principales:

- `TerrainMeshRef`: referencia a artifact de malla, formato, bounds y conteos.
- `TerrainFeature`: punto, poligono, path, objeto o anotacion.
- `TerrainLayerRef`: capas mesh-scalar, vector, raster u object-overlay.
- `selectedFeatureIds`: seleccion activa.
- `activeToolId`: tool montada por UI.

Los subagentes de escena pueden proponer cambios, pero la aplicacion debe
validar ownership, lock, visibilidad, schema y permisos antes de aplicarlos.

## Representaciones Generativas

Las representaciones comunican informacion del proyecto. Pueden ser creadas por
humanos, sistema o LLM, pero siempre se ejecutan dentro de un renderer permitido.

Renderers permitidos por contrato:

- `markdown-report`
- `echarts-chart`
- `data-table`
- `terrain-tooltip`
- `three-annotation`
- `dashboard-panel`

Reglas:

- El resultado generativo es un `RepresentationManifest`, `viewSpec` o artifact,
  no una mutacion arbitraria de la app.
- `allowedActions` limita que puede disparar la vista.
- `viewSpecSchema` define la forma de la salida renderizable.
- El origen generativo debe registrar provider, prompt artifact y modelo cuando
  aplique.
- Las vistas no pueden ejecutar codigo libre ni saltarse permisos de tools.
- Si una representacion necesita datos pesados, debe consultar artifacts o pedir
  un job, no incrustar arrays grandes en estado global.

## Contratos De Orquestacion

La capa formal de orquestacion se apoya en:

- `AgentManifest`: identidad, rol, runtime y capacidades del agente.
- `AgentCapability`: tipo de capacidad y ejecutable opcional.
- `OrchestratorPlan`: objetivo, agentes, estado y contexto.
- `OrchestratorTask`: unidad de trabajo, schema, input/output y job asociado.
- `TaskDependency`: bloqueos, outputs requeridos y aprobaciones.
- `TaskAssignment`: asignacion de tarea a agente y estado de intento.
- `AgentMessage`: instrucciones, observaciones, preguntas, handoffs y reviews.
- `AgentEvent`: timeline auditable para UI y debug.
- `ToolInvocation`: invocacion normalizada de tool, Rhino app o representacion.

Estos contratos evitan que un agente opere por convencion informal.

## Seguridad Y Limites

Limites obligatorios:

- V2WEB no modifica V1 para ejecutar esta arquitectura.
- La UI no llama Rhino Compute directamente.
- No se guardan arrays pesados en estado global.
- Todo modulo declara permisos y side effects.
- Toda accion persistente debe tener audit trail.
- Artifacts deben tener lineage cuando provienen de job, tool o Rhino app.
- Las acciones destructivas o ambiguas requieren aprobacion humana.
- Un subagente solo puede operar dentro de sus capacidades declaradas.
- Representaciones generativas no ejecutan codigo libre.
- Datos externos, APIs y modelos LLM se tratan como no confiables hasta validar
  schema y permisos.
- Errores deben devolver codigo, mensaje y detalles seguros, sin filtrar secretos.

Limites actuales de V2WEB-0:

- El backend local es un skeleton job-first.
- No hay shell frontend productivo conectado a estos contratos.
- La persistencia actual de jobs es local filesystem.
- Rhino Compute debe pasar por adaptador futuro.
- La integracion multiagente runtime esta definida por contrato, no por una UI
  final completa.

## Criterios Operativos

Una ejecucion se considera aceptable cuando:

- Existe plan con objetivo, estado y agente Director.
- Cada tarea tiene tipo, input, capabilities requeridas y estado.
- Cada ejecucion externa o pesada tiene job asociado.
- Cada artifact resultante tiene metadata y lineage.
- Cada vista generativa esta limitada por renderer, schema y allowed actions.
- El usuario puede ver progreso, resultado y errores recuperables.
- El Reviewer valida que la respuesta no viola permisos, ownership ni limites.
