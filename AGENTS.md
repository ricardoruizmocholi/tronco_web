# Troncodrilo Shop

Ecommerce de merchandising oficial del personaje "Troncodrilo". Incluye
tienda de productos, apartado de artistas colaboradores, y un mapa
interactivo del mundo ("Bola Troncodrilo") donde los usuarios suben un
fanfic (uno por usuario) que se publica tras aprobación del admin.

## Stack
- Frontend: React 18 + Vite + TypeScript + TailwindCSS
- Backend: Laravel 11 (API REST) + Laravel Sanctum (auth SPA, cookies)
- Base de datos: MySQL 8
- Pagos: Stripe (Checkout + Webhooks)
- Contenedores: Docker + Docker Compose
- Control de versiones: Git (convención de commits abajo)

## Arquitectura de conexión Frontend-Backend
React (SPA) y Laravel viven en contenedores separados pero bajo el mismo
dominio raíz en local vía proxy (Nginx) para que Sanctum funcione con
cookies de sesión (stateful). Laravel expone únicamente `/api/*` y
`/sanctum/csrf-cookie`. React nunca usa tokens JWT manuales: usa el flujo
cookie-based de Sanctum.

## Comandos
- `docker compose up -d` — levanta todos los servicios (frontend, backend, db, nginx)
- `docker compose exec backend php artisan migrate` — ejecuta migraciones
- `docker compose exec backend php artisan test` — tests backend (Pest/PHPUnit)
- `docker compose exec frontend npm run dev` — dev server React (si no usa Vite middleware de Docker)
- `docker compose exec frontend npm run test` — tests frontend (Vitest)
- `docker compose exec frontend npm run lint` — lint frontend
- `docker compose exec backend ./vendor/bin/pint` — formateo backend (Pint)

## Estructura del proyecto
- `src/frontend/` — aplicación React (SPA)
- `src/backend/` — aplicación Laravel (API)
- `docker/` — Dockerfiles y configuración de Nginx
- `spec/constitution/` — misión, stack, roadmap del proyecto
- `spec/features/` — specs por feature (numeradas: 001-, 002-...)
- `docs/` — notas de sesión, decisiones técnicas, MCD

## Convenciones
- Nombres de tablas en `snake_case` plural (Laravel estándar)
- Nombres de componentes React en `PascalCase`, hooks en `useCamelCase`
- Tests junto a su módulo: backend en `tests/Feature` y `tests/Unit`; frontend en `__tests__/` junto al componente
- Migraciones de Laravel como única fuente de verdad del esquema (no editar BD a mano)
- Validación de datos siempre en Form Requests de Laravel, nunca solo en el frontend
- Pagos: nunca confiar en el precio enviado desde el frontend; el backend recalcula el total antes de crear el PaymentIntent de Stripe
- Moderación: todo fanfic nace con estado `pending` y solo un admin puede pasarlo a `approved` o `rejected`

## Convención de commits
- `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` + descripción corta en imperativo
- Un commit por unidad lógica de cambio, no mezclar features

## No hagas
- No instalar dependencias nuevas (composer/npm) sin avisar antes
- No modificar el esquema de BD fuera de migraciones de Laravel
- No subir `.env`, claves de Stripe, ni credenciales al repositorio
- No mezclar lógica de negocio en los controladores; usar Services/Actions
- No exponer endpoints de admin (moderación, gestión de artistas) sin middleware de rol
- No usar `any` en TypeScript sin justificar con comentario

## Flujo de trabajo
- Antes de una tarea no trivial, propón un plan y espera mi OK
- Una tarea a la vez; al terminar, indica qué cambiaste para que lo revise
- Si no estás seguro al 80%, pregunta. No inventes campos, endpoints ni reglas de negocio
- Sigue siempre la spec de la feature activa en `spec/features/`

## Documentación
- Constitución del proyecto: `spec/constitution/`
- Modelo de datos (MCD/MER): `docs/mcd.md`
- Features (SDD): `spec/features/`