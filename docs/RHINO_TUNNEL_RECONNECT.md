# Reconexion Del Tunel Rhino Compute

Rhino Compute corre localmente en:

```bash
http://localhost:6001
```

El tunel rapido de Cloudflare cambia de URL cada vez que se reinicia o se vuelve
a abrir. Para reconectar:

```bash
npm run tunnel:rhino
```

Si quieres que falle de inmediato cuando Rhino Compute no esta activo:

```bash
npm run tunnel:rhino:strict
```

El comando:

- levanta `cloudflared tunnel --url http://localhost:6001`;
- guarda el PID y logs en `.runtime/`;
- detecta la URL nueva `https://*.trycloudflare.com`;
- actualiza `.env` con `VITE_RHINO_COMPUTE_URL`;
- actualiza `.env` con `VITE_RHINO_COMPUTE_TIMEOUT_MS=180000`;
- deja la URL lista para copiar en `.runtime/rhino-tunnel-url.txt`.

En AI Studio, pegar el valor nuevo en:

```bash
VITE_RHINO_COMPUTE_URL=https://...trycloudflare.com
VITE_RHINO_COMPUTE_TIMEOUT_MS=180000
```

Luego aplicar los cambios y reiniciar el preview.

Para probar la URL activa:

```bash
npm run tunnel:rhino:test
```

Notas:

- `.env` y `.runtime/` no se suben a GitHub.
- `VITE_MAX_AREA_HECTARES` queda en `100`.
- Si `/health` falla, primero levantar Rhino Compute y volver a probar.
- Para una URL fija se necesita un tunel nombrado con dominio propio o un
  servicio con URL reservada.
