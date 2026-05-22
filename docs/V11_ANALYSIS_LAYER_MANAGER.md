# V11 - Administrador De Capas De Analisis

Esta version agrega un sistema independiente de capas de analisis para el visor 3D.

## Objetivo

- Mantener una sola malla 3D base.
- Registrar las 20 capas inspiradas en Regrarians Base Maps.
- Aplicar capas livianas directamente sobre la malla en frontend.
- Dar boton `Procesar` a capas pesadas para crear manifest backend por proyecto.
- Evitar guardar datos pesados en Redux.

## Capas Frontend/Malla

Estas capas se derivan de la malla actual y se renderizan sobre el mismo `currentMesh`:

- Contornos
- Sombra de colina
- Elevacion
- Aspecto
- Alivio
- Poliedrico
- Pendiente
- Rangos de pendiente
- Formas del relieve
- Morfometria

## Capas Backend

Estas capas aparecen desde el primer hito, pero usan procesamiento backend:

- Capacidad terrestre
- Riesgo de erosion
- Velocidad de flujo
- Drenaje
- TWI
- Profundidad del valle
- Cobertura de vista
- Inundaciones
- Cuencas hidrograficas
- Exposicion al viento

En esta version el backend local crea un manifest y un artefacto liviano comprimido por capa. El calculo real puede reemplazarse luego por GDAL, GRASS GIS o WhiteboxTools sin cambiar el arbol de capas.

## Endpoints Locales

```http
GET /project/:projectId/analysis-layers
POST /project/:projectId/analysis-layers/:layerId/process
GET /project/:projectId/analysis-layers/:layerId/artifact
```

## Regla De Peso

El frontend no carga 20 mallas. Carga una malla base y aplica atributos/colores por capa. Las capas pesadas se representan por manifest y se activan solo bajo demanda.
