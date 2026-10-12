# 027 — Revisión de seguridad (hardening)

## Spec

### Qué hace
Auditoría manual del backend (rutas/middleware, autenticación, Stripe/pedidos/
facturas, subidas de archivos, modelos y admin) hecha leyendo el código
directamente del repo, no por archivos pegados en el chat. Cada hallazgo se
verificó empíricamente contra la app corriendo (no se reporta nada "a ojo")
antes de anotarlo aquí. El resultado es este backlog priorizado; **ningún
arreglo se ha aplicado todavía** — eso es trabajo de las tareas de abajo.

### Metodología
5 fases, en orden: (1) rutas y middleware, (2) autenticación y perfil,
(3) Stripe/pedidos/facturas, (4) subidas de archivos, (5) modelos y admin.
Cada hallazgo de autorización/IDOR se comprobó con una petición real contra
el stack en Docker (no solo lectura de código), y cada afirmación sobre qué
middleware protege qué ruta se verificó con una llamada `curl` real, no
asumida por el nombre del middleware.

### Hallazgos

#### 🔴 Alta

**H1 — Sin rate limiting en ningún endpoint.**
No existe un solo `throttle` en toda la app (`routes/api.php`,
`bootstrap/app.php`). `/login` y `/register` aceptan intentos ilimitados —
fuerza bruta de credenciales sin fricción. `/checkout` y
`/newsletter/subscribe` igual: sin límite, se pueden generar pedidos
`pending` o suscripciones en bucle.
*Archivos:* `routes/api.php`, `bootstrap/app.php`.

**H2 — nginx ejecutaría PHP dentro de `/storage` si llegara a haber un archivo `.php` ahí.**
`docker/nginx.conf`:
```nginx
location ~ \.php$ { fastcgi_pass backend:9000; ... }   # sin excluir /storage
location /storage { try_files $uri $uri/ =404; }        # prefix normal, sin ^~
```
Por las reglas de precedencia de nginx, una location regex (`~ \.php$`) gana
sobre una location de prefijo normal (`/storage`, sin `^~`), sea cual sea el
orden en el archivo. Si algún día una subida de archivo permite que un
`.php` acabe en el disco público de storage (bypass de validación, bug
futuro, etc.), nginx lo ejecutaría como código — esto no depende de que la
validación de subida sea buena o mala, es una capa de defensa que falta.
*Archivo:* `docker/nginx.conf`.

**H3 — Subida de imágenes admite SVG, que puede llevar `<script>` embebido.**
`ImageUploadController` (ruta `/api/upload-image`, accesible a *cualquier
usuario autenticado*, no solo admin — se usa para las imágenes de fanfics) y
el adjunto de `ReturnRequestController::store` validan con la regla `image`
de Laravel, que acepta SVG por defecto. Un SVG subido con `<script>` dentro
se sirve desde `/storage/images/{uuid}.svg`; si esa URL se abre
directamente (no solo referenciada en `<img>`), el script puede ejecutarse
en el origen de la app. La extensión guardada además viene de
`getClientOriginalExtension()` (controlada por quien sube el archivo), no
del tipo real detectado.
*Archivos:* `app/Http/Controllers/ImageUploadController.php`,
`app/Http/Controllers/ReturnRequestController.php`.

#### 🟠 Media

**M1 — `.env` de desarrollo no listo para producción, sin checklist explícita.**
`APP_ENV=local`, `APP_DEBUG=true`, `SESSION_SECURE_COOKIE` sin definir
(cookie de sesión no marcada `Secure` por defecto). Correcto para
desarrollo local, pero no hay ningún sitio que recuerde cambiarlo antes de
desplegar a IONOS. Si `APP_DEBUG=true` llega a producción, cualquier
excepción no capturada muestra la traza completa (rutas del servidor,
consultas SQL, y potencialmente valores de `.env`) a cualquier visitante —
uno de los fallos de configuración de Laravel más comunes y más graves.
*Archivo:* `src/backend/.env` (no versionado — por eso no hay nada que lo
fuerce a cambiar antes de un deploy).

**M2 — Enumeración de email en registro.**
`RegisterRequest` usa `unique:users,email`, así que el mensaje de error de
validación revela si un email ya tiene cuenta. Es un trade-off común (mejor
UX a cambio de una fuga de información menor), pero no está decidido
explícitamente en ningún sitio — vale la pena que sea una decisión, no un
efecto colateral.
*Archivo:* `app/Http/Requests/RegisterRequest.php`.

**M3 — Middleware `Authenticate.php` muerto y confuso.**
`app/Http/Middleware/Authenticate.php` tiene un `handle()` que no hace
nada, solo deja pasar la petición — parece un backdoor de autenticación.
Comprobado empíricamente (`curl` sin cookie a `/api/orders` y
`/api/admin/products`): ambos devuelven `401 Unauthenticated` correctamente,
así que esta clase **no** es lo que respalda `auth:sanctum` ahora mismo —
es código huérfano, no un agujero activo. El riesgo es que alguien, en el
futuro, lo conecte al alias `'auth'` pensando que es una personalización
legítima (ese es su nombre y ubicación esperados) y desactive la
autenticación sin darse cuenta.
*Archivo:* `app/Http/Middleware/Authenticate.php`.

#### 🟡 Baja

**B1 — Sin cabeceras de seguridad (CSP, X-Frame-Options, HSTS, X-Content-Type-Options).**
No hay middleware ni configuración de nginx que las añada. No son
bloqueantes por sí solas, pero son la primera línea de defensa contra
clickjacking y varios tipos de XSS.

**B2 — Política de contraseña mínima.**
`min:8` sin más — razonable para una tienda de merchandising, no exige
complejidad ni descarta contraseñas filtradas (`Password::uncompromised()`).
No es urgente, pero es una mejora barata.

**B3 — CORS y Sanctum `stateful` solo apuntan a `localhost`.**
No es una vulnerabilidad — es lo correcto para desarrollo — pero hace falta
una nota explícita de que `config/cors.php` (`allowed_origins`) y
`SANCTUM_STATEFUL_DOMAINS` deben actualizarse al dominio real antes de
desplegar, o el frontend en producción no podrá autenticarse contra la API.

### Lo que se revisó y salió limpio (para que quede constancia)
- **IDOR**: `CancellationController`, `ReturnRequestController`,
  `OrderController::show/invoice` comprueban `user_id` del pedido contra el
  usuario autenticado antes de cualquier acceso. Probado con un segundo
  usuario intentando descargar la factura de otro → `403`.
- **Mass assignment**: cero `$guarded = []` en todo `app/Models/`, cero
  `::create($request->all())` / `->update($request->all())` en todo
  `app/Http/Controllers/`. `role` está en `$fillable` de `User` pero ningún
  controlador lo expone — `AuthController::register`,
  `ProfileController::update` y `SocialAuthController` asignan campo a
  campo, nunca en bloque.
- **Webhook de Stripe**: firma verificada (`Webhook::constructEvent` +
  `STRIPE_WEBHOOK_SECRET`), fuera de `auth:sanctum` (ruta API, sin CSRF —
  Stripe no manda cookie de sesión), idempotente (`lockForUpdate()` +
  comprobación de estado `paid`), precio y envío recalculados siempre en
  servidor.
- **Rutas admin**: las ~60 rutas bajo `/api/admin/*` están TODAS dentro de
  un único grupo `['auth:sanctum', 'admin']` en `routes/api.php` — no hay
  ninguna ruta de admin fuera de ese grupo.
- **Subida de vídeo**: sí está correctamente restringida a admin
  (`VideoUploadController`, dentro del grupo admin), a diferencia de la
  subida de imágenes.

### Fuera de alcance de esta spec
- Aplicar los arreglos — eso es `plan.md`/`tasks.md` de esta misma feature,
  pendiente de que confirmes el orden antes de tocar código
- Limpiar `AGENTS.md` y `spec/constitution/security-baseline.md` (contenido
  corrupto de "ClimbForge", incidente de sesiones anteriores) — pregunto al
  final si se aborda junto con esto o aparte
- Pentesting automatizado / escaneo de dependencias (`composer audit` ya
  señaló 20 avisos en sesiones anteriores, sin revisar en detalle aquí)
