# Prompt Para Gemini En AI Studio - V5

Sincroniza primero desde GitHub.

Repositorio:

```text
https://github.com/brauliogatica/gravweb-aistudio-sync
```

Rama:

```text
main
```

Checkpoint V5 esperado:

```text
v5-local-processor-stub
```

Verifica que existan:

- `local-processor/server.mjs`
- `docs/V5_LOCAL_PROCESSOR_STUB.md`
- `src/services/localProcessorService.ts`
- `src/services/processingRequestService.ts`
- `src/pages/TerrenoDemoPage.tsx`

Objetivo:

- Validar que el frontend V4 pueda detectar un backend local real.
- No implementar Rhino todavía.
- No agregar secretos.
- No subir `node_modules`, `.git`, `dist`, `.env`, zips ni logs.

Comandos:

```bash
npm install
npm run processor:dev
npm run lint
npm run build
npm audit
```

Para conectar el frontend al stub local, usar en un `.env` local no versionado:

```bash
VITE_LOCAL_PROCESSOR_URL=http://127.0.0.1:8787
```

La app debe seguir funcionando aunque el procesador local no esté corriendo.
