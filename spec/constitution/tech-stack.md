# Stack Tecnológico y Convenciones

## Frontend
- React 18 + Vite + TypeScript (template `react-ts`)
- TailwindCSS 4 (plugin `@tailwindcss/vite`)
- Axios para llamadas HTTP al backend
- React Router para navegación (pendiente de instalar)
- Zustand o Context API para estado global (carrito, sesión de usuario) — pendiente de elegir
- Librería de mapa interactivo para "Bola Troncodrilo": evaluar
  `react-globe.gl` frente a `react-simple-maps`. Decisión se documenta
  en `spec/features/006-bola-troncodrilo/plan.md` cuando llegue el momento.

## Backend
- Laravel 12 (PHP 8.3, vía contenedor `php:8.3-fpm`)
- Laravel Sanctum para autenticación SPA (cookies, no JWT manual) — pendiente de instalar
- Laravel Form Requests para validación
- Services/Actions para lógica de negocio (no en controladores)
- Stripe PHP SDK para pagos (Checkout Sessions + Webhooks) — pendiente de instalar
- Roles de usuario: columna `role` en `users` (`user` / `admin`), sin paquete externo de permisos en el MVP

## Base de datos
- MySQL 8 (contenedor `mysql:8`)
- Base de datos: `troncodrilo`, usuario `troncodrilo`
- Acceso desde tu máquina (fuera de Docker) por el puerto `3307` (el 3306 lo usa XAMPP)
- Acceso interno entre contenedores por el puerto `3306` normal (nombre de host: `db`)
- Migraciones de Laravel como única fuente de verdad del esquema
- Seeders para datos de prueba (productos demo, artistas demo)

## Infraestructura (Docker)
- `docker-compose.yml` en la raíz, 3 servicios activos por ahora: `backend`, `frontend`, `db`
- Frontend accesible en tu navegador por `http://localhost:5175` (mapea al 5173 interno del contenedor)
- Backend expone el puerto interno `9000` (php-fpm), aún sin punto de entrada HTTP propio — pendiente Nginx
- Pendiente: añadir servicio `nginx` como proxy reverso único, necesario para que las cookies de Sanctum funcionen correctamente entre frontend y backend
- Variables sensibles (Stripe keys, DB password) en `.env`, nunca en el repo

## Testing
- Backend: Pest o PHPUnit (PHPUnit viene instalado por defecto con Laravel) — tests de Feature para endpoints, Unit para Services
- Frontend: Vitest + React Testing Library — pendiente de instalar

## Control de versiones
- Git, repositorio único (monorepo: frontend + backend)
- Ramas: `main` (estable), `dev` (integración), `feature/nombre-feature`

## Seguridad mínima del MVP
- CSRF protegido por Sanctum (`/sanctum/csrf-cookie`)
- Validación de roles en middleware para rutas de admin
- Backend recalcula precios antes de cualquier cobro con Stripe
- Webhook de Stripe verificado con firma secreta