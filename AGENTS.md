# ClimbForge

Aplicacion web (con evolucion a app movil via Capacitor) que ayuda a escaladores a mejorar
su rendimiento fisico combinando un plan de entrenamiento personalizado por IA, feedback
sobre tecnica a partir de video, y un planificador de dieta semanal ajustado a presupuesto,
restricciones alimentarias y tiempo disponible para cocinar.

## Stack
- Frontend: React 18 + TypeScript estricto + Vite + Tailwind CSS
- Mobile: Capacitor (empaqueta el mismo build de React, sin codebase nativo separado)
- Backend: Laravel (PHP 8.3), como API JSON pura (rutas api.php) — no vistas Blade
- Base de datos: MySQL/MariaDB (IONOS hosting compartido)
- Autenticacion: Laravel Sanctum (cookies httpOnly para el SPA, tokens para la app movil)
- Storage de video/foto: Cloudflare R2 (S3-compatible), no en el propio hosting IONOS
- IA: Google Gemini API, encapsulada detras de un AIProviderService propio
- Tests: Vitest (frontend) + Pest o PHPUnit (backend)
- Despliegue: SSH + git + composer install en IONOS (sin Docker, no disponible en hosting compartido)
- Desarrollo local: XAMPP (Apache + PHP + MySQL local)

## Comandos
- `composer install` (backend/) — instala dependencias PHP
- `php artisan serve` (backend/) — arranca el backend en local
- `npm run dev` (frontend/) — arranca el frontend en local
- `php artisan test` — ejecuta los tests de backend (deben pasar antes de cada commit)
- `npm run test` — ejecuta los tests de frontend
- `npm run lint` / `./vendor/bin/pint` — revisa estilo (antes de cada PR)

## Estructura del proyecto
- `frontend/` — React + TS
- `backend/` — Laravel (API, logica de negocio, orquestacion de IA)
- `spec/` — constitution y specs de features (fuente de verdad del proyecto)
- `tests/` — tests de integracion cruzados
- `docs/` — notas de sesion y decisiones

## Convenciones
- Nombres: camelCase en TS, snake_case en PHP/Laravel (convencion nativa del framework)
- Validacion de entrada SIEMPRE con Form Requests de Laravel, nunca validar a mano en el controlador
- Toda query a modelos con datos de usuario pasa por el global scope de autorizacion (ver security-baseline.md)
- Tests junto al archivo/feature correspondiente

## Seguridad — no negociable (detalle completo en spec/constitution/security-baseline.md)
- Nunca hardcodear claves ni secretos. Todo via variables de entorno (.env de Laravel); .env siempre en .gitignore
- MySQL no tiene RLS nativo: cada modelo con datos de usuario usa un Global Scope de Eloquent que filtra automaticamente por el usuario autenticado — es la compensacion obligatoria de esta ausencia
- Autenticacion via Laravel Sanctum: cookies httpOnly+secure+sameSite para el SPA de React, tokens Bearer para la futura app movil
- Cabeceras de seguridad (CSP, HSTS, X-Frame-Options) via middleware explicito — Laravel no las trae por defecto, hay que anadirlas
- Rate limiting con el middleware throttle de Laravel en login/signup y en toda la API
- Toda subida de archivo (video, foto) va a Cloudflare R2, nunca al disco del hosting IONOS
- HTTPS forzado en todos los entornos

## No hagas
- No instalar dependencias nuevas (composer o npm) sin avisar primero
- No subir .env, claves de Gemini/R2/base de datos, ni datos reales de usuarios a git
- No usar DB::raw() con interpolacion de variables sin bind — siempre Eloquent o Query Builder parametrizado
- No olvidar el Global Scope de autorizacion en ningun modelo nuevo con datos de usuario
- No implementar la Feature 005 (beta de rutas por foto/video) todavia — es futuro, no MVP

## Flujo de trabajo
- Antes de una tarea no trivial, propon un plan y espera mi OK (modo Plan)
- Una tarea a la vez; al terminar, dime que cambiaste para que lo revise
- Si no estas seguro al 80% de un requisito, pregunta — no inventes comportamiento
- Corre lint + tests antes de dar una tarea por terminada

## Documentacion
- Constitution en spec/constitution/
- Features en spec/features/
