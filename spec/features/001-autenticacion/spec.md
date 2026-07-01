# 001 — Autenticación

## Spec

### Qué hace
Registro e inicio de sesión de usuarios mediante Laravel Sanctum (SPA,
basado en cookies). Distingue entre `user` y `admin`.

### Criterios de aceptación
- [x] Un visitante puede registrarse con nombre, email y contraseña
- [x] Un usuario registrado puede iniciar sesión y la sesión persiste (cookie httpOnly)
- [x] Un usuario puede cerrar sesión
- [x] Las contraseñas se almacenan con hash (bcrypt, gestionado por Laravel)
- [x] Rutas protegidas del frontend (ej. "mi perfil", "mis pedidos") redirigen a login si no hay sesión
- [x] Endpoints de admin devuelven 403 si el usuario autenticado no tiene `role = admin`
- [x] El primer usuario admin se crea vía seeder, no hay registro público de admins
- [x] Validación de email único y formato correcto, contraseña mínimo 8 caracteres

### Fuera de alcance
- Login social (Google, etc.)
- Recuperación de contraseña por email (se puede añadir en fase post-MVP)

---

## Plan

### Backend (Laravel)
- Migración: añadir columna `role enum('user','admin') default 'user'` a la tabla `users` existente
- Instalar y configurar `laravel/sanctum`
- Endpoints: `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/user`
- Middleware `auth:sanctum` para rutas protegidas
- Middleware custom `EnsureUserIsAdmin` para rutas de admin
- Form Requests: `RegisterRequest`, `LoginRequest`

### Frontend (React)
- Páginas: `/login`, `/register`
- Llamada inicial a `GET /sanctum/csrf-cookie` antes del primer POST (requisito de Sanctum)
- Contexto/store de autenticación (`useAuth`) que guarda el usuario actual
- Componente `ProtectedRoute` que redirige a `/login` si no hay sesión
- Componente `AdminRoute` que redirige si `role !== admin`

### Dependencia
Requiere que `000-infraestructura-docker` esté completa (Nginx
funcionando, Axios apuntando al backend), ya que Sanctum necesita
mismo dominio raíz para las cookies.

---

## Tasks

1. [x] Migración: añadir columna `role` a `users`
2. [x] Instalar y configurar Sanctum (config, CORS, `SANCTUM_STATEFUL_DOMAINS`)
3. [x] Crear `RegisterRequest` y `LoginRequest`
4. [x] Crear `AuthController` con register/login/logout/user
5. [x] Crear middleware `EnsureUserIsAdmin`
6. [x] Seeder de usuario admin de prueba
7. [x] Tests Feature: registro exitoso, login exitoso, login fallido, acceso denegado a ruta admin sin rol
8. [x] Frontend: instalar React Router
9. [x] Frontend: páginas Login/Register con formularios y validación básica
10. [x] Frontend: `useAuth` hook + llamada a csrf-cookie
11. [x] Frontend: `ProtectedRoute` y `AdminRoute`
12. [x] Verificar los 8 criterios de aceptación