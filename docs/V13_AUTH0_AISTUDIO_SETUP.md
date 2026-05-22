# V13 Auth0 En AI Studio

AI Studio ejecuta el applet dentro de hosts dinamicos tipo `*.us-east1.run.app`.
Auth0 rechaza el login si el `redirect_uri` no esta autorizado en la aplicacion SPA.

## Configuracion minima en Auth0

En Auth0 Dashboard > Applications > Gravweb SPA > Settings:

### Allowed Callback URLs

Agregar:

```text
http://localhost:3000,
http://127.0.0.1:3000,
https://*.us-east1.run.app
```

Si AI Studio muestra otro origen, agregar tambien el resultado exacto de:

```js
window.location.origin
```

### Allowed Logout URLs

Agregar:

```text
http://localhost:3000,
http://127.0.0.1:3000,
https://*.us-east1.run.app
```

### Allowed Web Origins

Agregar:

```text
http://localhost:3000,
http://127.0.0.1:3000,
https://*.us-east1.run.app
```

## Comportamiento de desarrollo

En AI Studio, Gravweb usa `loginWithPopup` y guarda una sesion local de preview para no romper el iframe. Al cerrar sesion dentro de AI Studio se limpia la sesion local del app sin abrir una pestana externa de Auth0.

En una instalacion propia de produccion, fuera de AI Studio, Auth0 puede usar redireccion normal y logout completo.
