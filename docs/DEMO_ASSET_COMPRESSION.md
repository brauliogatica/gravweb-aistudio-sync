# Compresion De Assets Demo

Los assets de `public/demo` se versionan como `*.json.gz` para que AI Studio
cargue menos peso al importar el proyecto.

## Archivos Comprimidos

- `gen.json.gz`: malla base del terreno demo (`vertices`, `normals`, `faces`).
- `objects.json.gz`: objetos y mallas auxiliares.
- `lineas.json.gz`: lineas hidrologicas principales.
- `lineasamarillas.json.gz`: lineas amarillas.
- `lineasazules.json.gz`: lineas azules.
- `ARjson.json.gz`: export hidrologico normalizado desde el formato legado.
- `project.json.gz`, `listas.json.gz`, `echarts.json.gz`: metadata liviana.

## Carga En Frontend

`src/services/demoProjectLoader.ts` busca primero `archivo.json.gz`. Si existe,
lo descarga y lo descomprime en el navegador con `DecompressionStream("gzip")`.
Si no existe, intenta cargar `archivo.json` como respaldo.

## Regla De Migracion

No volver a subir los JSON crudos del demo cuando exista su equivalente
`*.json.gz`. Para mallas reales futuras, preferir `GLB` comprimido o binarios
especificos del procesador local; TopoJSON queda reservado para capas
vectoriales como poligonos, limites, cuencas y lineas.
