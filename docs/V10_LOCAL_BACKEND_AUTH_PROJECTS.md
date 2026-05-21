# V10 Local Backend, Auth And Projects

V10 agrega una capa local minima para avanzar sin Mongo y sin tocar el flujo
estable V9.2 de `/analisis`, `/particles`, Rhino y terreno demo.

## Objetivo

- Backend local compatible con `ProjectService.ts`.
- Persistencia file-backed en este PC.
- Dashboard `/proyectos` por usuario.
- Auth local de desarrollo consolidado.
- Orquestador stub para preparar trabajos y subagentes futuros.

## Backend Local

Servidor:

```bash
npm run backend:dev
```

Por defecto escucha en:

```bash
http://127.0.0.1:3100
```

Si existe `G:\backendgravi`, usa esa carpeta como almacenamiento. Si no existe,
usa `.runtime/backend`.

Variables opcionales:

```bash
GRAVWEB_BACKEND_HOST=127.0.0.1
GRAVWEB_BACKEND_PORT=3100
GRAVWEB_BACKEND_DATA_DIR=G:\backendgravi
GRAVWEB_BACKEND_MAX_BODY_MB=80
GRAVWEB_BACKEND_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

El frontend se conecta con:

```bash
VITE_API_BASE_URL=http://127.0.0.1:3100
```

## Endpoints

Auth local:

```bash
GET /auth/me
```

Proyectos:

```bash
GET    /project
GET    /project/user/:userId
POST   /project/
GET    /project/:id
GET    /project/:id/arjson
PUT    /project/:id
DELETE /project/:id
```

Orquestador:

```bash
GET  /orchestrator/agents
GET  /orchestrator/jobs
GET  /orchestrator/jobs/:id
POST /orchestrator/jobs
```

## Persistencia

La metadata liviana queda en:

```bash
projects.json
jobs.json
```

Los artefactos pesados del proyecto quedan comprimidos como:

```bash
artifacts/<projectId>.json.gz
```

Esto evita meter mallas pesadas dentro del repositorio y permite que GitHub/AI
Studio sigan livianos.

## Seguridad

Esta V10 es desarrollo local:

- no usa Mongo;
- no guarda secretos;
- no implementa login real;
- no protege rutas;
- no reemplaza Auth0 productivo.

Para produccion, auth y permisos deben pasar por un proveedor real y el backend
debe validar tokens antes de leer/escribir proyectos.

## Prueba Rapida

En una terminal:

```bash
npm run backend:dev
```

En otra:

```bash
npm run dev
```

Abrir:

```bash
http://127.0.0.1:3000/proyectos
```

El usuario local por defecto es:

```bash
local-dev-user
```

## Conectar AI Studio Al Backend Local

El navegador de AI Studio no puede usar `http://127.0.0.1:3100` para llegar a
este PC. Para exponer el backend local de proyectos, abrir un tunel:

```bash
npm run tunnel:backend:strict
npm run tunnel:backend:test
```

El script escribe el valor en:

```bash
.runtime/backend-tunnel-url.txt
```

Copiar ese valor en AI Studio:

```bash
VITE_API_BASE_URL=https://<backend-tunnel>.trycloudflare.com
```

Rhino usa otro tunel separado:

```bash
VITE_RHINO_COMPUTE_URL=https://<rhino-tunnel>.trycloudflare.com
```
