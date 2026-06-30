# 000 — Infraestructura Docker

## Spec

### Qué hace
Levanta el entorno de desarrollo completo con un único comando, con
React, Laravel, MySQL y Nginx comunicándose correctamente entre sí.

### Criterios de aceptación
- [x] `docker compose up -d` levanta los servicios `frontend`, `backend`, `db` sin errores
- [x] Acceder a `http://localhost:5175` muestra la app de React
- [ ] Servicio `nginx` añadido como punto de entrada único (puerto 80)
- [ ] Acceder a `http://localhost/api/health` (endpoint de prueba) responde 200 desde Laravel a través de Nginx
- [ ] Laravel puede conectar a MySQL y ejecutar `php artisan migrate` sin errores
- [ ] `GET /sanctum/csrf-cookie` devuelve la cookie correctamente a través de Nginx
- [ ] Los volúmenes persisten datos de MySQL entre reinicios de contenedor
- [ ] Hot-reload de React funciona en desarrollo (cambios se reflejan sin rebuild)
- [ ] Axios en el frontend configurado apuntando a la URL del backend vía Nginx
- [ ] `.env.example` documentado para backend y frontend, `.env` real ignorado por Git

### Fuera de alcance
- Configuración de producción (esto es solo el entorno de desarrollo local)
- CI/CD

---

## Plan

### Servicios Docker Compose (estado actual)
1. `backend`: PHP 8.3-fpm — **levantado**, escucha en 9000 (sin punto de entrada HTTP propio aún)
2. `frontend`: Node 20, Vite dev server — **levantado**, accesible en `localhost:5175`
3. `db`: MySQL 8 — **levantado**, accesible en `localhost:3307` desde fuera, `db:3306` desde dentro de la red Docker
4. `nginx`: **pendiente** — proxy reverso, punto de entrada único en puerto 80

### Nginx — reglas de proxy (a implementar)
- `/` → proxy a `frontend:5173`
- `/api/*` → proxy a `backend:9000` (vía fastcgi_pass, ya que backend es php-fpm puro)
- `/sanctum/*` → proxy a `backend`
- Headers correctos para que las cookies de sesión funcionen (same-site)

### Por qué Nginx es necesario (no opcional)
Laravel Sanctum, en modo SPA, depende de que frontend y backend
compartan el mismo dominio raíz para que las cookies de sesión
funcionen (no es viable con CORS cross-origin entre `localhost:5175` y
un futuro `localhost:8000`). Nginx unifica ambos bajo `http://localhost`.

### Variables de entorno necesarias
- Backend: `DB_HOST=db`, `DB_DATABASE=troncodrilo`, `DB_USERNAME=troncodrilo`, `DB_PASSWORD=secret`, `APP_URL=http://localhost`, `SANCTUM_STATEFUL_DOMAINS=localhost`, `SESSION_DOMAIN=localhost`
- Frontend: `VITE_API_URL=http://localhost/api`

---

## Tasks

1. [x] Crear `docker/Dockerfile.backend`
2. [x] Crear `docker/Dockerfile.frontend`
3. [x] Crear `docker-compose.yml` con backend, frontend, db
4. [x] Crear proyecto Laravel base en `src/backend`
5. [x] Crear proyecto React base en `src/frontend`
6. [x] Verificar conexión Laravel → MySQL con `php artisan migrate` dentro del contenedor
7. [x] Crear `docker/nginx.conf`
8. [x] Añadir servicio `nginx` al `docker-compose.yml`
9. [x] Crear endpoint de prueba `GET /api/health` en Laravel
10. [x] Configurar `.env.example` en backend y frontend
11. [x] Instalar Axios apuntando a `VITE_API_URL` (ya instalado el paquete, falta configurar uso)
12. [x] Verificar los 10 criterios de aceptación uno a uno