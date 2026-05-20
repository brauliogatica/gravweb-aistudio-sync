# V9 Projects Dashboard

V9 agrega una entrada minima para el dashboard de proyectos:

- ruta `/proyectos`;
- item `Proyectos` en el navbar;
- reutilizacion de `ProjectList`;
- usuario de desarrollo `local-dev-user` desde `Auth0Stub`;
- proteccion contra consultas con usuario indefinido.

El dashboard necesita un backend compatible con las rutas heredadas:

```bash
GET /project/user/:userId
DELETE /project/:id
```

Para conectarlo localmente, usar una variable publica Vite:

```bash
VITE_API_BASE_URL=http://127.0.0.1:3100
```

Si no existe `VITE_API_BASE_URL`, la pantalla muestra un error controlado y
no rompe las rutas principales `/analisis` ni `/particles`.

La siguiente iteracion debe reemplazar el backend heredado con un backend local
file-backed/SQLite que guarde metadata liviana en DB y mallas pesadas como
artefactos comprimidos en disco.
