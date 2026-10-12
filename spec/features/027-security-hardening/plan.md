# 027 — Plan de arreglo

Orden: de alta a baja severidad. Cada arreglo es independiente — no hace
falta hacerlos todos en el mismo PR.

## H1 — Rate limiting
- `throttle:5,1` (5 intentos/minuto) en `/login` y `/register`
- `throttle:3,1` en `/newsletter/subscribe`
- `throttle:10,1` en `/checkout` (un usuario legítimo no necesita más de 10
  intentos de checkout por minuto; protege contra bucles de creación de
  pedidos `pending`)
- Evaluar `throttle:60,1` como límite global por defecto en el grupo `api`
  (Laravel lo trae de serie en versiones anteriores; en el skeleton actual
  hay que añadirlo a mano en `bootstrap/app.php`)

## H2 — nginx: bloquear ejecución de PHP bajo /storage
Reordenar/acotar el bloque de `docker/nginx.conf` para que `/storage` nunca
llegue a la location de PHP, usando `^~` para que gane por prefijo:
```nginx
location ^~ /storage {
    root /var/www/html/public;
    try_files $uri $uri/ =404;
}

location ~ \.php$ {
    ...
}
```
(El orden de bloques en el archivo no importa una vez que `/storage` usa
`^~` — gana por las reglas de precedencia de nginx, no por aparecer antes.)

## H3 — Excluir SVG de las subidas de imagen
Cambiar la regla de validación de `image` a una whitelist explícita sin SVG
en los dos sitios:
- `ImageUploadController::store`: `'image' => ['required','file','mimes:jpeg,png,gif,webp','max:5120']`
- `ReturnRequestController::store`: mismo cambio en la regla de `image`

Además, derivar la extensión guardada del MIME real detectado
(`$file->extension()` o un mapa fijo MIME→extensión) en vez de
`getClientOriginalExtension()`, para que el nombre del archivo en disco
nunca dependa de lo que diga el cliente.

## M1 — Checklist de despliegue (producción)
No es código — es una checklist a seguir antes de cada deploy a IONOS:
- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `SESSION_SECURE_COOKIE=true`
- [ ] `SANCTUM_STATEFUL_DOMAINS` con el dominio real (no `localhost`)
- [ ] `config/cors.php` → `allowed_origins` con el dominio real
- [ ] Confirmar que `.env` de producción nunca se commitea (ya está en
      `.gitignore`, pero merece doble check tras el incidente de las líneas
      `$env:STRIX_LLM` que aparecieron ahí por error)

## M2 — Enumeración de email
Decisión a tomar, no solo código: o se acepta el trade-off (UX mejor, fuga
menor) y se documenta aquí como aceptado, o se cambia el mensaje de error a
uno genérico ("Si ya tienes cuenta, inicia sesión en su lugar" sin
confirmar/negar) a costa de peor UX en el formulario. Pendiente de decidir
contigo antes de tocar `RegisterRequest`.

## M3 — Eliminar `Authenticate.php` muerto
Borrar `app/Http/Middleware/Authenticate.php` (confirmado que no lo usa
nada — `auth:sanctum` funciona sin él) para que no quede como trampa futura.

## B1 — Cabeceras de seguridad
Middleware nuevo (`SecurityHeaders`) aplicado al grupo `api`, o añadido vía
nginx: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security` (solo si HTTPS confirmado en prod),
`Content-Security-Policy` — este último necesita revisar qué orígenes
externos carga el frontend (Stripe, Google Fonts si los hay) antes de
escribir la política, para no romper nada.

## B2 — Política de contraseña
`Password::min(8)->uncompromised()` en `RegisterRequest` (API de validación
de contraseñas de Laravel, comprueba contra la base de HaveIBeenPwned sin
mandar la contraseña en claro — k-anonymity).

## B3 — Nota de despliegue CORS/Sanctum
Ya cubierto por la checklist de M1 — no hace falta trabajo aparte.

---

## Reglas para que esto no vuelva a pasar
(Esto es lo que el plan original pedía meter en `AGENTS.md` — como ese
archivo está corrupto con contenido de otro proyecto, lo dejo aquí hasta
que decidas si se limpia aparte.)

- Toda ruta nueva bajo `/api/admin/*` va dentro del grupo
  `['auth:sanctum', 'admin']` existente en `routes/api.php` — nunca un
  `Route::` suelto fuera de ese grupo
- Toda subida de archivo de imagen usa `mimes:jpeg,png,gif,webp` explícito,
  nunca la regla genérica `image` (que incluye SVG)
- Todo endpoint público de escritura (login, registro, newsletter,
  checkout, cualquier `POST`/`PUT` sin autenticar) lleva `throttle` desde
  el primer commit, no se añade "después"
- Ningún controlador nuevo usa `::create($request->all())` ni
  `->update($request->all())` — siempre campo a campo o con
  `$request->validated()` sobre una whitelist explícita de la FormRequest
- Antes de cada deploy a IONOS, repasar la checklist de M1 de este plan
