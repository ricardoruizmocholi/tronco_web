# Stack Tecnológico y Convenciones

## Frontend
- React 19 + Vite + TypeScript, TailwindCSS v4 (plugin `@tailwindcss/vite`)
- Axios para llamadas HTTP al backend (`src/frontend/src/lib/axios.ts`)
- React Router v7 para navegación
- Zustand para el carrito (`src/frontend/src/store/cartStore.ts`); Context
  API para sesión de usuario, moneda, modal de auth, notificaciones admin
- `react-globe.gl` + `react-leaflet` para los mapas interactivos de "Bola
  Troncodrilo"
- Sistema de diseño propio en `index.css` (tokens `--color-primary`
  `#5BBB2A`, `--color-ink` `#1A1A1A`, `--color-canvas` `#FAFAF8`,
  `--color-secondary` `#8B4A2A`); `.btn-primary`/`.btn-secondary` públicos,
  `.btn-admin-*` para el panel de admin — radio de esquina 2px (`rounded-xs`
  en Tailwind v4) en todo el sitio, sin sombras (`box-shadow: none`
  global)

## Backend
- Laravel 12, PHP 8.2+ (corre sobre PHP 8.3 en los contenedores actuales)
- Laravel Sanctum para autenticación SPA (cookies httpOnly, no JWT manual)
- Laravel Socialite para login con Google
- Laravel Form Requests para validación de entrada
- La lógica de negocio vive mayormente en los controladores; los flujos con
  pasos no triviales (numeración de facturas, generación de PDF,
  reembolsos de Stripe) se extraen a clases en `app/Services/`
- Stripe PHP SDK para pagos (Checkout Sessions + Webhooks verificados por firma)
- `barryvdh/laravel-dompdf` para generar el PDF de las facturas
- `maatwebsite/excel` para las exportaciones CSV/Excel del admin
- Roles de usuario: columna `role` en `users` (`user` / `admin`), sin
  paquete externo de permisos
- Autorización por propiedad comprobada explícitamente en cada controlador
  (`$modelo->user_id !== $request->user()->id`) — no hay Global Scope de
  Eloquent que lo haga automáticamente

## Base de datos
- MySQL (contenedor `db` en desarrollo; IONOS gestionado en producción)
- Migraciones de Laravel como única fuente de verdad del esquema
- Tests de backend corren contra SQLite en memoria (`RefreshDatabase`) — no
  es exactamente el mismo motor que producción; cuidado con `CHECK`
  constraints o sintaxis que se comporte distinto entre SQLite y MySQL al
  alterar columnas (ha pasado: el `enum` de `orders.status` no se actualiza
  igual al añadir valores nuevos vía migración en SQLite que en MySQL)

## Infraestructura (Docker)
- `docker-compose.yml` en la raíz, 4 servicios: `backend`, `frontend`, `db`, `nginx`
- Nginx (`docker/nginx.conf`) como proxy único — reenvía `/api`, `/sanctum`,
  `/auth` y cualquier `*.php` a `backend:9000` (PHP-FPM), sirve `/storage`
  como archivos estáticos (nunca ejecuta PHP ahí — `location ^~ /storage`,
  ver `spec/features/027-security-hardening/`), y el resto a
  `frontend:5173` (Vite dev server)
- Variables sensibles (claves de Stripe, contraseña de BD, `APP_KEY`) solo
  en `.env`, nunca en el repo (`.env` en `.gitignore`)

## Testing
- Backend: PHPUnit, vía `php artisan test`. Tests de Feature en
  `tests/Feature/`, uno por controlador/flujo
- Hay una base de ~19 tests que fallan por causas preexistentes sin
  relación con cambios nuevos (principalmente `FanficTest`, por falta de
  una factory de `Fanfic` con `image_url`, y 2 en `CheckoutTest`) —
  compara el recuento total contra ese baseline conocido en vez de esperar
  0 fallos
- Frontend: sin framework de test automatizado instalado todavía. La
  verificación de UI se hace manualmente o con scripts Playwright ad-hoc
  en el entorno de desarrollo

## Control de versiones
- Git, repositorio único (monorepo: frontend + backend + specs)
- Un commit por unidad lógica de cambio independiente, no mezclar arreglos
  de naturaleza distinta (más fácil revertir uno sin deshacer el otro)

## Seguridad mínima
Ver `spec/constitution/security-baseline.md` para el detalle completo y
`spec/features/027-security-hardening/` para la auditoría que estableció
estas prácticas:
- CSRF protegido por Sanctum (`/sanctum/csrf-cookie`)
- Validación de rol de admin vía middleware (`['auth:sanctum', 'admin']`)
  en *todas* las rutas de `/api/admin/*`, sin excepción
- Backend recalcula precios y envío antes de cualquier cobro con Stripe
- Webhook de Stripe verificado con firma secreta, idempotente (no duplica
  factura ni descuenta stock dos veces en un reenvío)
- Rate limiting por IP (limitadores nombrados, no el `throttle:N,1` por
  defecto) en login, registro, checkout y newsletter
- Subidas de imagen restringidas a `mimes:jpeg,png,gif,webp` (sin SVG);
  extensión del archivo guardado derivada del MIME real detectado, nunca
  del nombre que mande el cliente
