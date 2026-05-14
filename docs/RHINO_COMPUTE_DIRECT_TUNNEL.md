# Rhino Compute Direct Tunnel

Para la prueba directa de desarrollo, AI Studio puede hablar con Rhino Compute
por el tunel de Cloudflare:

```bash
VITE_RHINO_COMPUTE_URL=https://migration-postcards-warner-cheers.trycloudflare.com
```

El tunel actual responde:

- `GET /`: `compute.rhino3d`
- `GET /health`: `200`
- `POST /io`: metadata del archivo Grasshopper
- `POST /grasshopper`: resultado del solve

## Prueba Ejecutada

Se probo `src/components/rhinoCompute/io_req.json` contra el tunel.

Resultados observados:

- `POST /io`: alrededor de 2.1 s, respuesta de 5.9 KB.
- `POST /grasshopper`: alrededor de 61 s, respuesta de 1.88 MB cruda.
- La respuesta de `/grasshopper` comprime a alrededor de 285 KB con gzip.
- Los outputs pesados detectados fueron `mesh` y `objectsjson`.

## Politica Para Mallas Pesadas

Durante esta prueba directa se acepta recibir JSON desde Rhino Compute para
validar el circuito. Para produccion, evitar subir estos resultados al repo y
evitar guardarlos en AI Studio.

Cuando el resultado crezca, preferir:

- recibir la respuesta en runtime,
- transformar mallas a `GLB` o binario,
- comprimir assets,
- y versionar solo manifests livianos.
