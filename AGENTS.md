# Troncodrilo Shop

Ecommerce de merchandising oficial del personaje "Troncodrilo". Incluye
tienda de productos, apartado de artistas colaboradores, facturación
automática, y un mapa interactivo del mundo ("Bola Troncodrilo") donde los
usuarios suben un fanfic (uno por usuario) que se publica tras aprobación
del admin. Detalle completo en `spec/constitution/mission.md`.

## Stack
- Frontend: React 19 + Vite + TypeScript + TailwindCSS v4
- Backend: Laravel 12 (PHP 8.2+) + Laravel Sanctum (auth SPA, cookies httpOnly)
- Base de datos: MySQL (contenedor Docker en desarrollo; IONOS en producción)
- Pagos: Stripe (Checkout Sessions + Webhooks)
- Login social: Laravel Socialite (Google OAuth)
- PDF: barryvdh/laravel-dompdf (facturas)
- Excel/CSV: maatwebsite/excel (exportaciones del admin)
- Contenedores: Docker + Docker Compose (backend, frontend, db, nginx)
- Control de versiones: Git

## Arquitectura de conexión Frontend-Backend
React (SPA) y Laravel viven en contenedores separados, con Nginx como proxy
único delante de los dos (`docker/nginx.conf`) para que las cookies de
Sanctum funcionen correctamente (stateful, mismo origen). Laravel expone
`/api/*`, `/sanctum/csrf-cookie` y las dos rutas de OAuth de Google en
`routes/web.php`. React nunca usa tokens JWT manuales — usa el flujo
cookie-based de Sanctum (`EnsureFrontendRequestsAreStateful`).

## Comandos
- `docker compose up -d` — levanta todo el stack (backend, frontend, db, nginx)
- `docker exec troncodrilo_backend php artisan test` — tests de backend (PHPUnit)
- `docker exec troncodrilo_backend php artisan migrate` — migraciones
- `docker exec troncodrilo_backend php artisan tinker` — consola interactiva
- `docker exec troncodrilo_frontend npx vite build` — build de producción del frontend
- `docker exec troncodrilo_frontend npx eslint src` — lint de frontend
- No hay suite de tests automatizados en frontend todavía (sin Vitest ni
  equivalente instalado) — la verificación de UI es manual/Playwright ad-hoc

## Estructura del proyecto
- `src/frontend/` — aplicación React (SPA)
- `src/backend/` — aplicación Laravel (API)
- `docker/` — Dockerfiles y `nginx.conf`
- `spec/constitution/` — misión, stack, roadmap del proyecto
- `spec/features/` — specs por feature (numeradas: 000-, 001-...), cada una
  con `spec.md` (Specify + Plan + Tasks)

## Convenciones
- Nombres de tablas en `snake_case` plural (Laravel estándar); componentes
  React en `PascalCase`, hooks en `useCamelCase`
- Tests de backend en `tests/Feature/`, uno por controlador/flujo que cubren
- Migraciones de Laravel como única fuente de verdad del esquema — nunca
  editar la BD a mano
- Validación de entrada con Form Requests de Laravel en los endpoints que
  lo requieren; nunca solo en el frontend
- **Autorización por propiedad**: este proyecto no usa un Global Scope de
  Eloquent para filtrar datos de usuario — cada controlador que accede a un
  registro ajeno (pedido, factura, devolución...) comprueba explícitamente
  `$modelo->user_id !== $request->user()->id` antes de continuar. Todo
  controlador nuevo que toque datos de un usuario necesita esta comprobación
- Pagos: nunca confiar en el precio enviado desde el frontend; el backend
  siempre recalcula el total antes de crear la Stripe Checkout Session
- Moderación: todo fanfic nace con estado `pending`, solo un admin puede
  pasarlo a `approved` o `rejected`
- Nunca `::create($request->all())` ni `->update($request->all())` —
  siempre campo a campo o `$request->validated()` sobre una whitelist
  explícita de la FormRequest

## Convención de commits
- `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` + descripción
  corta en imperativo
- Un commit por unidad lógica de cambio independiente — no mezclar arreglos
  de naturaleza distinta en el mismo commit (más fácil de revertir uno sin
  deshacer el otro)

## Seguridad — no negociable (detalle completo en spec/constitution/security-baseline.md)
- Nunca hardcodear claves ni secretos. Todo vía variables de entorno
  (`.env` de Laravel); `.env` siempre en `.gitignore`
- Rate limiting con limitadores nombrados por IP (no el `throttle:N,1` por
  defecto de Laravel, que prioriza el usuario autenticado sobre la IP) en
  login, registro, checkout y newsletter — ver `AppServiceProvider::boot()`
- Toda subida de imagen usa `mimes:jpeg,png,gif,webp` explícito, nunca la
  regla genérica `image` (acepta SVG, que puede llevar `<script>` embebido)
- `/storage` nunca debe poder ejecutar PHP, pase lo que pase en la
  validación de subida — ver `location ^~ /storage` en `docker/nginx.conf`
- Webhook de Stripe siempre verificado por firma (`STRIPE_WEBHOOK_SECRET`),
  nunca solo por venir de una IP esperada

## No hagas
- No instalar dependencias nuevas (composer o npm) sin avisar antes
- No modificar el esquema de BD fuera de migraciones de Laravel
- No subir `.env`, claves de Stripe, ni credenciales ni datos reales de
  usuarios al repositorio
- No exponer endpoints de admin sin el middleware `['auth:sanctum', 'admin']`
- No usar la regla de validación genérica `image` para subidas de archivo
- No usar `any` en TypeScript sin justificar con comentario

## Flujo de trabajo
- Antes de una tarea no trivial, propón un plan y espera el OK
- Una tarea a la vez; al terminar, indica qué cambió para que se revise
- Si no estás seguro de un requisito, pregunta — no inventes comportamiento,
  campos ni reglas de negocio
- Corre los tests de backend (`php artisan test`) antes de dar una tarea por
  terminada; compara contra el baseline de fallos preexistentes conocido,
  no asumas que debe dar 0 fallos
- Sigue siempre la spec de la feature activa en `spec/features/`

## Documentación
- Constitución del proyecto: `spec/constitution/`
- Features (SDD): `spec/features/`
