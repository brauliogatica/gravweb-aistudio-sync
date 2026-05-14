# V5 Local Processor Stub

V5 adds a minimal local backend for the frontend adapter introduced in V4. It is
only a stub: it validates a `ProcessingRequest`, returns a local `jobId`, and
keeps the terrain demo fallback intact.

## Run

```bash
npm run processor:dev
```

Default URL:

```bash
http://127.0.0.1:8787
```

Connect the frontend by using a local `.env` file:

```bash
VITE_LOCAL_PROCESSOR_URL=http://127.0.0.1:8787
```

Do not commit `.env`.

## Endpoints

### GET `/health`

Returns:

```json
{
  "status": "available",
  "message": "Gravweb local processor stub ready.",
  "version": "v5-local-stub",
  "endpoints": ["/health", "/process-terrain"]
}
```

### POST `/process-terrain`

Accepts a `ProcessingRequest`.

Returns:

```json
{
  "ok": true,
  "jobId": "local-job-...",
  "message": "Processing request accepted by local stub processor.",
  "receivedAt": "ISO-8601",
  "summary": {
    "requestId": "terrain-...",
    "source": "manual-polygon",
    "pointCount": 4,
    "centroid": { "lat": 0, "lng": 0 },
    "areaM2": 10000
  }
}
```

## Configuration

Optional server variables:

```bash
LOCAL_PROCESSOR_HOST=127.0.0.1
LOCAL_PROCESSOR_PORT=8787
LOCAL_PROCESSOR_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

The default CORS policy allows local development origins and AI Studio preview
origins. This is only for the local stub. A production processor must use a
stricter allowlist.

## Security

- No private keys are used.
- No external dependencies are required.
- Request bodies are limited to 1 MB.
- The service validates the basic `ProcessingRequest` shape.
- Rhino or other heavy processing must be added behind this service later, not
  inside the browser.
