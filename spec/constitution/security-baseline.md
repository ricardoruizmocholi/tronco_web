# Seguridad Baseline — Troncodrilo Shop

Checklist no negociable. Ninguna feature se da por terminada si no cumple
lo que le aplica. Basado en la auditoría manual de
`spec/features/027-security-hardening/` (octubre 2026) — lo que sigue es
el estado real verificado del proyecto, no una aspiración.

## 1. Secretos y claves
- [x] Ninguna clave (Stripe, credenciales de MySQL, `APP_KEY`) hardcodeada en código
- [x] `.env` en `.gitignore` desde el primer commit
- [ ] Antes de cada deploy a IONOS, repasar: `APP_ENV=production`,
      `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`,
      `SANCTUM_STATEFUL_DOMAINS` con el dominio real,
      `config/cors.php` → `allowed_origins` con el dominio real. El `.env`
      de desarrollo tiene `APP_DEBUG=true` a propósito — si eso llega a
      producción, cualquier excepción no capturada muestra la traza
      completa (y potencialmente variables de `.env`) a cualquier
      visitante. Checklist sin automatizar todavía
      (`spec/features/027-security-hardening/plan.md`, M1)

## 2. Base de datos (MySQL, sin RLS nativo)
- [x] Cada endpoint que accede a un registro de usuario (pedido, factura,
      devolución) comprueba la propiedad explícitamente en el controlador
      (`$modelo->user_id !== $request->user()->id`) — este proyecto no usa
      un Global Scope de Eloquent, la comprobación es responsabilidad de
      cada controlador nuevo. Verificar en cada PR que un controlador
      nuevo con datos de usuario no se olvidó de esta comprobación
- [x] Consultas siempre vía Eloquent o Query Builder parametrizado;
      prohibido `DB::raw()` con interpolación de variables
- [x] Cero `$guarded = []` en los modelos, cero
      `::create($request->all())` / `->update($request->all())` en los
      controladores (mass assignment) — confirmado por auditoría completa
      del repo, no solo muestreo
- [ ] Cifrado en tránsito (HTTPS/TLS) obligatorio en producción; cifrado en
      reposo depende del plan de IONOS, verificar al desplegar

## 3. Autenticación y sesión (Laravel Sanctum)
- [x] SPA de React autenticada vía cookie httpOnly (Sanctum SPA
      authentication), no vía token en localStorage
- [x] Contraseñas hasheadas por Laravel (bcrypt) por defecto
- [x] Rate limiting en login/registro — limitadores nombrados por IP
      (`AppServiceProvider::boot()`), no el `throttle:N,1` por defecto de
      Laravel: ese prioriza el usuario autenticado sobre la IP cuando hay
      uno disponible, y como el registro hace login automático tras crear
      la cuenta, el límite por defecto no protegía `/register` contra
      registro masivo (cada alta con éxito le daba al siguiente intento
      una cuenta de límite nueva). Ver
      `spec/features/027-security-hardening/`, hallazgo H1
- [ ] Política de contraseña: solo `min:8` por ahora, sin comprobación
      contra contraseñas filtradas (`Password::uncompromised()`) — mejora
      barata pendiente, no urgente (hallazgo B2)
- [ ] Enumeración de email en registro: `unique:users,email` revela si un
      email ya tiene cuenta. Trade-off aceptado por UX, no arreglado
      (hallazgo M2) — decisión pendiente de confirmar explícitamente

## 4. API / Backend
- [x] Validación de entrada con Form Requests de Laravel en los endpoints
      que lo requieren
- [x] Todas las rutas de `/api/admin/*` dentro de un único grupo
      `['auth:sanctum', 'admin']` en `routes/api.php` — verificado que no
      hay ninguna ruta de admin fuera de ese grupo
- [x] Rate limiting en endpoints públicos de escritura sensibles (login,
      registro, checkout, newsletter) — ver sección 3
- [ ] Sin middleware de cabeceras de seguridad (CSP, HSTS, X-Frame-Options,
      X-Content-Type-Options) todavía — pendiente, revisar qué orígenes
      externos carga el frontend antes de escribir la CSP (hallazgo B1)
- [ ] HTTPS forzado: pendiente de verificar en el deploy real a IONOS
- [x] CORS restringido a un origen explícito (`config/cors.php`), nunca `*`
      — actualizar al dominio real antes de desplegar (hallazgo B3)

## 5. Subida de archivos
- [x] Todo archivo subido va a `storage/app/public` vía Laravel Storage,
      nunca a una ruta servida con posibilidad de ejecución
- [x] Whitelist de tipos MIME explícita (`mimes:jpeg,png,gif,webp`) en toda
      subida de imagen — nunca la regla genérica `image` de Laravel, que
      acepta SVG (puede llevar `<script>` embebido). Ver
      `spec/features/027-security-hardening/`, hallazgo H3
- [x] Nombre de archivo generado por el servidor (UUID), nunca el original
      del usuario; la extensión guardada viene del MIME real detectado
      (`$file->extension()`), nunca de `getClientOriginalExtension()`
- [x] `/storage` nunca ejecuta PHP, con independencia de qué consiga pasar
      la validación de subida — `location ^~ /storage` en
      `docker/nginx.conf` obliga a nginx a tratarlo como el prefijo más
      largo y no evaluar la location regex de PHP después. Sin esto, un
      `.php` que acabara ahí por cualquier vía se habría ejecutado como
      código (RCE independiente de la validación de los controladores).
      Ver hallazgo H2 — el más serio de la auditoría
- [x] Límite de tamaño máximo por archivo (5 MB imágenes, 100 MB vídeo)

## 6. Stripe / pagos
- [x] El precio y el coste de envío los calcula siempre el backend, nunca
      se acepta el valor que manda el frontend
- [x] Webhook de Stripe con firma verificada
      (`Webhook::constructEvent` + `STRIPE_WEBHOOK_SECRET`)
- [x] Webhook idempotente: un reenvío del mismo evento no duplica factura
      ni descuenta stock dos veces (`lockForUpdate()` + comprobación de
      estado antes de procesar)
- [x] Numeración de factura correlativa sin huecos garantizada con
      `lockForUpdate()` sobre un contador por serie/año, en la misma
      transacción que crea la factura — no un `MAX(numero)+1` sin bloqueo

## Código muerto a vigilar
- `app/Http/Middleware/Authenticate.php` tiene un `handle()` que no hace
  nada (solo pasa la petición) — confirmado por `curl` que no es lo que
  respalda `auth:sanctum` ahora mismo (las rutas protegidas devuelven 401
  correctamente sin él), pero el nombre y la ubicación son justo los que
  esperaría alguien que quisiera personalizar la autenticación. Si algún
  día se conecta al alias `'auth'` pensando que es una personalización
  legítima, desactivaría toda la autenticación sin que nadie se diera
  cuenta. Pendiente de borrar (hallazgo M3)
