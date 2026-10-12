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
3. [x] H3 — `ImageUploadController` y `ReturnRequestController`: regla de
   validación cambiada de `image` (acepta SVG) a `mimes:jpeg,png,gif,webp`
   explícito; extensión guardada ahora viene de `$file->extension()` (MIME
   real detectado) en vez de `getClientOriginalExtension()` (nombre que
   manda el cliente). De paso, comentario corregido en
   `ImageUploadController` — la ruta real es `/api/upload-image` (sin
   prefijo `/admin`, accesible a cualquier usuario autenticado, no solo
   admin — el comentario decía lo contrario).
   6 tests nuevos (`ImageUploadTest`, `ReturnRequestImageTest`): SVG
   rechazado con 422, imagen real aceptada, extensión guardada viene del
   MIME real y no del nombre de archivo del cliente, invitado sin sesión
   recibe 401. Suite completa: 92 passed / 19 failed (baseline
   preexistente sin relación).
4. [x] M1 — `php artisan app:check-deploy-readiness`: comprueba `APP_ENV`,
   `APP_DEBUG`, `APP_KEY`, `SESSION_SECURE_COOKIE`,
   `SANCTUM_STATEFUL_DOMAINS` y `cors.allowed_origins`; sale con código
   distinto de cero si algo falla (encadenable en un script de deploy).
   Automatizado en vez de solo documentado — una checklist en markdown
   depende de que alguien se acuerde de mirarla antes de cada deploy.
   Verificado contra el `.env` de desarrollo actual (5 de 6 comprobaciones
   fallan correctamente, como se espera en local) y con overrides de
   config simulando producción (3 tests nuevos,
   `CheckDeployReadinessCommandTest`). Suite completa: 95 passed / 19
   failed (mismo baseline).
5. [x] M2 — Decidido: mitigar, no aceptar el trade-off. `unique:users,email`
   sustituido por una closure de validación con mensaje genérico, mismo
   campo/forma de respuesta (422, `errors.email`) — el frontend no
   necesitó cambios. Límite honesto documentado en `spec.md`: sin
   verificación por email (fuera de alcance), la existencia aún se puede
   inferir por la aparición del error, solo que ya no se confirma
   explícitamente. 1 test nuevo (`AuthTest`). Suite completa: 96 passed /
   19 failed (mismo baseline).
6. [x] M3 — Borrado `app/Http/Middleware/Authenticate.php` (confirmado sin
   referencias en todo el repo). Verificado: `auth:sanctum` sigue
   devolviendo 401 en rutas protegidas sin él, suite completa sin cambios
   (92 passed / 19 failed, mismo baseline).
7. [ ] B1 — Middleware de cabeceras de seguridad (revisar orígenes externos
   del frontend antes de escribir la CSP)
8. [x] B2 — `Password::min(8)->uncompromised()` en `RegisterRequest`;
   consulta la API de HaveIBeenPwned por k-anonimato (solo se envía un
   prefijo del hash, nunca la contraseña en claro). `TestCase` base fakea
   la llamada HTTP por defecto para que el resto de tests no dependan de
   un tercero externo ni se ralenticen; el test que prueba el rechazo
   sustituye el `UncompromisedVerifier` del contenedor directamente en vez
   de pelear con el orden de resolución de `Http::fake()` (el fake por
   defecto, registrado antes, gana siempre sobre uno más específico
   registrado después — se descubrió escribiendo el test, no se asumió).
   2 tests nuevos. Suite completa: 97 passed / 19 failed (mismo baseline).
9. [ ] Tests de regresión para cada arreglo que lo permita (rate limiting,
   SVG rechazado, nginx no ejecuta `.php` bajo `/storage`) + QA manual +
   commit + push
