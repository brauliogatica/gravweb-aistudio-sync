# V6 - Rhino Compute Roundtrip Probe

## Objetivo

Validar el camino directo:

AI Studio -> Cloudflare Tunnel -> PC local -> Rhino Compute -> AI Studio

sin agregar un backend intermedio y sin reemplazar todavia el terreno demo.

## Comportamiento en `/particles`

- Si existe una `ProcessingRequest`, la vista muestra sus datos.
- La malla demo ya no se carga automaticamente para solicitudes manuales.
- El boton `Probar ida-vuelta Rhino` envia una prueba liviana al endpoint `/io`.
- El boton `Cargar terreno demo` mantiene disponible el modelo 3D actual como baseline visual.
- Si no hay malla procesada real, el demo sigue siendo una opcion manual y estable.

## Variables necesarias

```bash
VITE_RHINO_COMPUTE_URL=https://migration-postcards-warner-cheers.trycloudflare.com
VITE_GOOGLE_MAPS_API_KEY=
VITE_MAX_AREA_HECTARES=100
```

## Nota tecnica

La prueba usa el archivo existente `src/components/rhinoCompute/io_req.json` como payload de compatibilidad para `/io`. Esto confirma POST ida-vuelta contra Rhino Compute, pero todavia no representa el procesamiento completo del poligono seleccionado ni una malla nueva.

El siguiente paso sera reemplazar esta prueba por un contrato real de Grasshopper que reciba el poligono, devuelva una respuesta liviana y solo despues cargue o pinte la malla resultante.
