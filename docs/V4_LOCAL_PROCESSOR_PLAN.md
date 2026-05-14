# V4 Local Processor Plan

V4 introduces a small browser-side adapter for a future local terrain processor.
It does not implement Rhino processing yet and it must not block the current demo
fallback.

## Environment

The frontend reads one public variable:

```bash
VITE_LOCAL_PROCESSOR_URL=
```

Vite exposes it in the browser as `import.meta.env.VITE_LOCAL_PROCESSOR_URL`.

## Endpoints

### GET `/health`

Expected response:

```json
{
  "status": "available",
  "message": "Local processor ready"
}
```

The UI treats failed requests, non-2xx responses and missing configuration as
non-blocking states. The terrain demo continues to load.

### POST `/process-terrain`

Payload: `ProcessingRequest`.

Expected response:

```json
{
  "ok": true,
  "jobId": "local-job-id",
  "message": "Processing queued"
}
```

## Frontend Adapter

`src/services/localProcessorService.ts` exports:

- `getLocalProcessorUrl()`
- `hasLocalProcessor()`
- `checkLocalProcessorHealth()`
- `submitProcessingRequest(request)`

## Security

- No private keys in React.
- No `.env` files committed.
- Only public `VITE_*` configuration reaches the browser.
- If the local processor ever needs credentials, they belong in the local
  backend, not in this frontend.
- The local backend should use explicit CORS rules for the local app origin.

## Current UI Behavior

`/particles` shows a HUD with the local processor state:

- `No configurado`
- `Verificando`
- `Disponible`
- `No disponible`

If the processor is missing or unreachable, the app keeps loading the terrain
demo from `public/demo`.
