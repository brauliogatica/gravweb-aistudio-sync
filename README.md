<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gravweb AI Studio Sync

Repositorio puente para la migracion iterativa de la Plataforma Gravitacional:
AI Studio -> GitHub -> Codex -> entorno local.

La raiz del proyecto contiene la V2 minima:

- `/analisis`: seleccion de terreno con navbar, herramientas y flujo de poligono.
- `/particles`: terreno demo migrado con carga lazy.
- `/proyectos`: dashboard minimo de proyectos por usuario local/dev.
- `ia-studio/v1-helloworld`: snapshot historico de la V1 Hello World.
- V4 agrega un adaptador no bloqueante para un procesador local futuro.
- V5 agrega un backend local minimo en `local-processor/`.
- V10 agrega un backend local file-backed en `local-backend/` para proyectos,
  auth local y orquestador stub sin Mongo.
- Los datos demo de `public/demo` se guardan como `*.json.gz` para reducir
  el peso de AI Studio; el loader los descomprime en el navegador.

## Reglas De Intercambio

No subir:

- `node_modules/`
- `.git/`
- `dist/`
- `.env` o secretos reales
- JSON demo crudos si ya existe su version `*.json.gz`
- zips, logs o datos multimedia gigantes

Si AI Studio necesita abrir la app sin claves, la pantalla de analisis usa un modo local de respaldo. Para activar Google Maps real, configurar una clave publica restringida:

```bash
VITE_GOOGLE_MAPS_API_KEY=
```

En AI Studio, agregar la misma variable en `Settings -> Secrets` con el nombre
exacto `VITE_GOOGLE_MAPS_API_KEY`. La app lee esa configuracion desde
`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.

## Uso Local

```bash
npm install
npm run dev
npm run backend:dev
npm run processor:dev
npm run build
npm run lint
npm audit
```

## Variables Publicas

Usar solo variables `VITE_*` en archivos locales `.env` no versionados:

```bash
VITE_GOOGLE_MAPS_API_KEY=
VITE_API_BASE_URL=http://127.0.0.1:3100
VITE_RHINO_COMPUTE_URL=
VITE_RHINO_COMPUTE_TIMEOUT_MS=180000
VITE_MAX_AREA_HECTARES=100
```

El dashboard `/proyectos` se conecta opcionalmente al backend local V10 con
`VITE_API_BASE_URL`. No es obligatorio para abrir `/analisis` o `/particles`.

Para probar proyectos locales sin Mongo:

```bash
npm run backend:dev
```

El backend escucha en `http://127.0.0.1:3100` y guarda datos en
`G:\backendgravi` si esa carpeta existe. Los artefactos pesados se guardan como
`artifacts/<projectId>.json.gz`.

Para conectar `/proyectos` desde AI Studio al backend de este PC:

```bash
npm run tunnel:backend:strict
npm run tunnel:backend:test
```

Copiar la URL generada en `VITE_API_BASE_URL`.

`VITE_LOCAL_PROCESSOR_URL` queda reservado para un servicio local con:

- `GET /health`
- `POST /process-terrain`

Si no esta configurado, la app conserva el fallback del terreno demo.

Para probar Rhino Compute directo desde AI Studio durante desarrollo:

```bash
VITE_RHINO_COMPUTE_URL=https://migration-postcards-warner-cheers.trycloudflare.com
```

La URL debe responder `GET /health`, `POST /io` y `POST /grasshopper`.

Para abrir un tunel nuevo y copiar la URL a AI Studio:

```bash
npm run tunnel:rhino
npm run tunnel:rhino:test
```

Para probar el procesador local V5:

```bash
npm run processor:dev
```

Luego usar en `.env` local:

```bash
VITE_LOCAL_PROCESSOR_URL=http://127.0.0.1:8787
```

Para conectar el procesador local desde AI Studio, agregar tambien:

```bash
VITE_LOCAL_PROCESSOR_URL=http://127.0.0.1:8787
```
