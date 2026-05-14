<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gravweb AI Studio Sync

Repositorio puente para la migracion iterativa de la Plataforma Gravitacional:
AI Studio -> GitHub -> Codex -> entorno local.

La raiz del proyecto contiene la V2 minima:

- `/analisis`: seleccion de terreno con navbar, herramientas y flujo de poligono.
- `/particles`: terreno demo migrado con carga lazy.
- `ia-studio/v1-helloworld`: snapshot historico de la V1 Hello World.
- V4 agrega un adaptador no bloqueante para un procesador local futuro.
- V5 agrega un backend local minimo en `local-processor/`.
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

## Uso Local

```bash
npm install
npm run dev
npm run processor:dev
npm run build
npm run lint
npm audit
```

## Variables Publicas

Usar solo variables `VITE_*` en archivos locales `.env` no versionados:

```bash
VITE_GOOGLE_MAPS_API_KEY=
VITE_API_BASE_URL=
VITE_RHINO_COMPUTE_URL=
VITE_LOCAL_PROCESSOR_URL=
VITE_MAX_AREA=10000
```

`VITE_LOCAL_PROCESSOR_URL` queda reservado para un servicio local con:

- `GET /health`
- `POST /process-terrain`

Si no esta configurado, la app conserva el fallback del terreno demo.

Para probar el procesador local V5:

```bash
npm run processor:dev
```

Luego usar en `.env` local:

```bash
VITE_LOCAL_PROCESSOR_URL=http://127.0.0.1:8787
```
