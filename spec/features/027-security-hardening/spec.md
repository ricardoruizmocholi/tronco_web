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

**M2 — Enumeración de email en registro. [Mitigado]**
`RegisterRequest` usaba `unique:users,email`, así que el mensaje de error
de validación confirmaba literalmente "The email has already been taken".
Decisión: mitigar, no aceptar el trade-off. La regla `unique` se sustituyó
por una closure de validación que comprueba lo mismo pero devuelve un
mensaje genérico ("No se pudo completar el registro con ese email. Si ya
tienes cuenta, inicia sesión en su lugar.") en el mismo campo/forma de
respuesta (422, `errors.email`), así que el frontend no necesitó ningún
cambio. **Límite honesto de esta mitigación**: sin un paso de verificación
por email (que este proyecto no tiene — el usuario queda logueado
inmediatamente tras registrarse), un atacante todavía puede inferir que un
email existe por la propia aparición del error, aunque el mensaje ya no lo
diga con todas las letras. Eliminar el vector por completo requeriría
añadir confirmación por email antes de dar la cuenta por creada — fuera de
alcance de este arreglo puntual.
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

**B1 — Sin cabeceras de seguridad (CSP, X-Frame-Options, HSTS, X-Content-Type-Options). [Arreglado parcialmente]**
No había middleware ni configuración de nginx que las añadiera. Añadidas en
dos sitios, porque Laravel solo sirve `/api/*` — nunca la página HTML del
frontend:
- `App\Http\Middleware\SecurityHeaders` en el grupo `api` — `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, una CSP mínima (`default-src 'none'`,
  ya que una respuesta JSON no necesita permitir nada) y HSTS cuando la
  petición es HTTPS
- `docker/nginx.conf`, bloque `location /` — las mismas cabeceras más una
  CSP real para la página, con los orígenes externos que el frontend
  carga de verdad: `fonts.googleapis.com`/`fonts.gstatic.com` (tipografía),
  `nominatim.openstreetmap.org` (geocoding), `*.basemaps.cartocdn.com`
  (tiles del mapa, cubierto por el `https:` amplio de `img-src`),
  `unpkg.com` (textura del globo), `youtube.com`/`vimeo.com` (embeds de
  vídeo de artista). `img-src` se dejó ancho a `https:` a propósito: el
  admin puede pegar cualquier URL externa como avatar/logo/banner/hero
  (campos de texto libre), y una whitelist estrecha ahí rompería contenido
  ya configurado sin avisar
- Verificado en vivo con Playwright contra las 5 páginas que cargan algo
  externo (home, tienda, mapa, bola, artistas) — 0 violaciones de CSP en
  consola. Encontró un problema real de paso: la textura del globo
  (`BolaTroncodriloPage.tsx`) usaba una URL protocol-relative
  (`//unpkg.com/...`), que en un sitio servido por HTTP resuelve a
  `http://` y la bloquea un `img-src` que solo permite `https:` — corregido
  a `https://` explícito en el propio código, no relajando la CSP
- **Por qué "parcialmente"**: esto cubre `/api/*` (Laravel) y el proxy de
  desarrollo local (`docker/nginx.conf`, Vite dev server detrás). La
  página real en **producción** la serviría lo que sea que IONOS use para
  el build estático (`npm run build`) — todavía sin decidir/configurado en
  este repo — y esas cabeceras no están replicadas ahí porque ese sitio no
  existe todavía. Pendiente cuando se decida el mecanismo de despliegue
  del frontend a IONOS
- `script-src` necesitó `'unsafe-inline'` — descubierto probando en vivo,
  no asumido: el dev server de Vite inyecta un script de arranque inline
  para el HMR, y sin `'unsafe-inline'` la página entera no cargaba en
  local. El build estático de producción no inyecta scripts inline (solo
  `<script src="...">`), así que la CSP de lo que sirva el build en IONOS
  debería poder prescindir de esto y quedar más estricta

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
