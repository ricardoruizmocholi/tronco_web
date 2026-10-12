# 027 — Tasks

Orden confirmado: H2 primero (es el único con riesgo de RCE, y el arreglo
más barato de los tres — no toca lógica de la app). Luego H1 y H3, que son
independientes entre sí. Medios y bajos al final. La limpieza de
`AGENTS.md`/`security-baseline.md` queda **fuera** de esta feature — housekeeping
aparte, no se mezcla con una auditoría de seguridad verificable.

1. [x] H2 — `docker/nginx.conf`: `location ^~ /storage` para que PHP nunca
   se ejecute ahí, pase lo que pase en la validación de subida.
   Verificado: un `.php` colocado a mano en `storage/app/public/` ahora se
   sirve como texto plano (`application/octet-stream`) en vez de
   ejecutarse; una imagen real sigue sirviéndose con su content-type
   correcto; `/api/health` y la home siguen respondiendo con normalidad.
2. [x] H1 — Limitadores nombrados por IP (`auth`: 5/min, `checkout`: 10/min,
   `newsletter`: 3/min) en `AppServiceProvider`, aplicados a `/login`,
   `/register`, `/checkout`, `/newsletter/subscribe`. **No** el
   `throttle:N,1` por defecto de Laravel — ese prioriza el usuario
   autenticado sobre la IP, y como `AuthController::register()` hace login
   automático tras crear la cuenta, el límite por defecto no protege
   `/register` contra registro masivo (cada alta con éxito le da al
   siguiente intento una cuenta nueva). Detectado escribiendo el test antes
   de darlo por bueno, no asumiendo que "throttle" ya bastaba.
   Límite global del grupo `api` descartado — el polling de
   `/maintenance-status` (cada 15s) + notificaciones + navegación normal
   podría disparar falsos positivos en una sesión activa legítima.
   6 tests nuevos (`AuthTest`, `NewsletterTest`, `CheckoutTest`); suite
   completa en 86 passed / 19 failed (los 19 son el baseline preexistente
   sin relación, confirmado antes de empezar).
3. [ ] H3 — `ImageUploadController` y `ReturnRequestController`: excluir
   SVG de las subidas de imagen, derivar la extensión del MIME real en vez
   de `getClientOriginalExtension()`
4. [ ] M1 — Documentar/automatizar la checklist de despliegue (¿script de
   verificación pre-deploy, o solo documentación en `docs/`?)
5. [ ] M2 — Decidir el trade-off de enumeración de email antes de tocar
   `RegisterRequest`
6. [ ] M3 — Borrar `app/Http/Middleware/Authenticate.php`
7. [ ] B1 — Middleware de cabeceras de seguridad (revisar orígenes externos
   del frontend antes de escribir la CSP)
8. [ ] B2 — `Password::uncompromised()` en `RegisterRequest`
9. [ ] Tests de regresión para cada arreglo que lo permita (rate limiting,
   SVG rechazado, nginx no ejecuta `.php` bajo `/storage`) + QA manual +
   commit + push
