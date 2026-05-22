# V12 Scientific Analysis Engine

Esta version convierte las 20 capas de Regrarians/Basemaps en artefactos reales calculados desde la malla 3D guardada del terreno (`genJson`).

## Principio de arquitectura

- El frontend mantiene capas instantaneas para no bloquear al usuario.
- El boton `Procesar` llama al backend local y genera un artefacto comprimible por capa.
- El artefacto usa `renderer: "mesh-scalar"` y `valueBinding: "vertex-index"`.
- El visor pinta los valores por vertice sin descargar mallas duplicadas.
- Si el backend no esta disponible, el demo y las capas instantaneas siguen funcionando.

## Artefacto

```json
{
  "schemaVersion": "gravweb-terrain-analysis-artifact/v12",
  "renderer": "mesh-scalar",
  "valueBinding": "vertex-index",
  "valueRange": [0, 1],
  "values": [0.12, 0.48, 0.91]
}
```

`values.length` debe coincidir con el numero de vertices del visor.

## Render de colores

El visor no usa una paleta unica. Cada capa declara implicitamente un modo de lectura:

- Continuas: estiramiento visual por cuantiles para evitar colores lavados.
- Categoricas: clases discretas sin interpolacion (`Rangos de pendiente`, `Formas del relieve`, `Cuencas hidrograficas`).
- Ciclicas: `Aspecto` usa matiz circular.
- Binarias/lineales: `Contornos` usa contraste alto para resaltar isolineas.

Esto mantiene los calculos livianos y evita enviar texturas pesadas desde el backend.

## Capas

| # | Capa | Metodo V12 |
|---|------|------------|
| 01 | Contornos | Proximidad a isolineas por intervalo de elevacion. |
| 02 | Sombra de colina | Hillshade por normales y vector solar. |
| 03 | Elevacion | Elevacion Z normalizada. |
| 04 | Aspecto | Orientacion de pendiente por normales. |
| 05 | Alivio | Elevacion combinada con sombreado. |
| 06 | Poliedrico | Rugosidad local y variacion facetada. |
| 07 | Pendiente | Pendiente por normal/gradiente local. |
| 08 | Rangos de pendiente | Clases discretas de pendiente. |
| 09 | Formas del relieve | Clasificacion TPI + pendiente + drenaje. |
| 10 | Morfometria | Posicion topografica y curvatura relativa. |
| 11 | Capacidad terrestre | Indice multicriterio inverso a erosion/inundacion/rugosidad. |
| 12 | Riesgo de erosion | Proxy de potencia de flujo: pendiente + acumulacion + rugosidad. |
| 13 | Velocidad de flujo | Proxy por pendiente y acumulacion. |
| 14 | Drenaje | Acumulacion D8-like sobre grafo de vertices. |
| 15 | TWI | `ln(a / tan(beta))` con area contribuyente aproximada. |
| 16 | Profundidad del valle | Confinamiento relativo y concentracion de drenaje. |
| 17 | Cobertura de vista | Proxy topografico de visibilidad/prominencia. |
| 18 | Inundaciones | Baja elevacion + baja pendiente + humedad topografica. |
| 19 | Cuencas hidrograficas | Etiquetas de cuenca por seguimiento descendente hasta sumideros. |
| 20 | Exposicion al viento | Altura + prominencia + aspecto respecto al viento dominante. |

## Linea cientifica

Esta V12 usa una implementacion local liviana sobre malla para que AI Studio pueda operar sin instalar GIS pesado. El siguiente nivel recomendado para produccion es reemplazar o complementar el motor con herramientas GIS especializadas:

- GDAL `gdaldem` para hillshade, slope, aspect, TRI, TPI y roughness.
- GRASS `r.slope.aspect`, `r.watershed`, `r.geomorphon` y `r.viewshed`.
- WhiteboxTools para flujo, acumulacion, humedales, TWI, cuencas y riesgo de erosion.

La interfaz y el contrato ya quedan preparados para ese reemplazo: solo hay que producir el mismo artefacto `mesh-scalar` o una futura variante raster/tiles.
