# Google Maps En Vite Y AI Studio

La pantalla `/analisis` usa Google Maps si existe:

```bash
VITE_GOOGLE_MAPS_API_KEY=
```

En AI Studio debe configurarse en `Settings -> Secrets` con ese nombre exacto.
En desarrollo local puede ir en un archivo `.env.local` no versionado:

```bash
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_publica_de_google_maps
VITE_LOCAL_PROCESSOR_URL=http://127.0.0.1:8787
VITE_MAX_AREA_HECTARES=100
```

## APIs De Google Necesarias

- Maps JavaScript API
- Places API
- Geocoding API no es obligatoria para la carga actual
- Static Maps API solo se usa para generar miniaturas

## Fallback

Si `VITE_GOOGLE_MAPS_API_KEY` no existe, `/analisis` no carga el script de
Google Maps y usa el modo local con coordenadas de prueba. Esto mantiene AI
Studio operativo aunque no tenga la key configurada.
