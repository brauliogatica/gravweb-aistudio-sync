# V11 Local Auth First

V11 cambia el flujo de entrada:

1. La app abre primero una pantalla de autenticacion local.
2. El usuario inicia sesion o se registra con correo.
3. El `sub` generado desde ese correo se usa como `userId`.
4. `/analisis`, `/particles` y `/proyectos` quedan protegidos.
5. Cada proyecto guardado queda asociado al usuario activo.

## Rutas

```bash
/login      pantalla inicial de autenticacion
/analisis   mapa y seleccion de terreno
/particles  visualizador de terreno
/proyectos  dashboard por usuario
```

Si no hay sesion activa, cualquier ruta protegida redirige a `/login`.

## Sesion Local

La sesion se guarda en `localStorage`:

```bash
gravweb.currentUser
```

El usuario local tiene esta forma:

```json
{
  "sub": "local-user:correo@dominio.cl",
  "name": "Nombre",
  "email": "correo@dominio.cl"
}
```

## Alcance

Esto no reemplaza Auth0 productivo. Es una capa local para la migracion
controlada en AI Studio/GitHub/PC, manteniendo el contrato de usuario por
proyecto que necesita el backend.

## Probar

1. Abrir `/`.
2. Debe redirigir a `/login`.
3. Entrar con un correo.
4. Crear o procesar un terreno.
5. Guardar el proyecto desde "Detalles del proyecto".
6. Abrir `/proyectos`.
7. Confirmar que el proyecto aparece bajo ese usuario.
8. Cerrar sesion y entrar con otro correo.
9. Confirmar que el dashboard queda separado por usuario.
