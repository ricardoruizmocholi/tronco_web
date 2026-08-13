# 023 — Modal de autenticación + Google OAuth

## Spec

### Qué hace
Sustituye las páginas `/login` y `/register` por un modal accesible desde
cualquier punto de la app (header, drawer móvil, rutas protegidas, prompts
de "inicia sesión para X"). Añade "Continuar con Google" vía Laravel
Socialite. La sesión sigue siendo Sanctum SPA (cookies) — Google solo
crea o vincula el usuario, luego usa el mismo mecanismo de sesión que
email/password.

### Criterios de aceptación
- [x] Click en "Iniciar sesión" en el header → abre modal con blur de fondo
- [x] Tabs "Iniciar sesión"/"Registrarse" cambian con fade 150ms
- [x] Login con email/password funciona desde el modal
- [x] Registro con email/password funciona desde el modal
- [x] Click en "Continuar con Google" → redirige a Google
- [x] Tras autenticarse con Google → vuelve a la app logueado (verificado hasta el punto en que
      Google exige credenciales reales — el redirect con `client_id`/`redirect_uri`/`scope`
      correctos está confirmado con Playwright; el `?auth=success` → `refreshUser()` →
      `closeModal()` también se verificó simulando el retorno directamente)
- [x] Usuario creado con Google aparece en la BD con `google_id` (lógica del controller cubierta;
      pendiente de una cuenta Google real para verse en datos, ver nota en Tasks)
- [x] `ProtectedRoute`: acceder a /perfil sin sesión → abre modal (no página dedicada)
- [x] /login y /register redirigen a home con el modal abierto
- [x] En móvil el modal ocupa casi toda la pantalla
- [x] El blur del fondo es visible detrás del modal

### Fuera de alcance
- Otros proveedores OAuth (GitHub, Apple, etc.) — se documenta cómo añadirlos
- Recuperación de contraseña por email
- Vincular una cuenta Google desde el perfil ya logueado (la vinculación
  solo ocurre automáticamente por email coincidente en el callback)

---

## Plan

### Backend (Laravel)
- Instalar `laravel/socialite`
- `config/services.php`: credenciales Google (`client_id`, `client_secret`, `redirect`)
- `config/app.php`: nueva key `frontend_url` para construir el redirect final al SPA
- Migración: `google_id` nullable + unique en `users`, después de `email`
- `SocialAuthController`:
  - `redirectToGoogle()` → JSON `{ url }` con la URL de autorización de Google
  - `handleGoogleCallback()` → busca usuario por `google_id` o `email`; si
    existe por email sin `google_id` lo vincula; si no existe lo crea
    (password aleatorio, `email_verified_at` = now); `Auth::login()` +
    regenerar sesión; redirige a `{frontend_url}/?auth=success`
- Rutas públicas `GET /api/auth/google` y `GET /api/auth/google/callback`,
  fuera del grupo `auth:sanctum`
- `AuthController` (login/register/logout/user) — sin cambios

### Frontend (React)
- `AuthModal.tsx`: overlay con blur, tabs login/registro, formularios
  portados de las páginas actuales, botón "Continuar con Google"
- `AuthModalContext.tsx`: estado global `isOpen`/`defaultTab`,
  `openModal()`/`closeModal()`, hook `useAuthModal()`
- `AuthContext.tsx`: nuevo método `refreshUser()` (no existía)
- `App.tsx`: `AuthModalProvider`, montaje único de `AuthModal`, detección
  de `?auth=success` en la URL de retorno
- `LoginPage.tsx` / `RegisterPage.tsx`: pasan a ser shims que abren el
  modal y redirigen a `/`
- Todos los puntos de entrada a `/login` y `/register` (header, drawer
  móvil, rutas protegidas, prompts inline de favoritos/mapa/bola) pasan
  a usar `openModal()`

---

## Tasks

1. [x] Backend: instalar Socialite, configurar credenciales, `SocialAuthController`, migración `google_id`, rutas públicas
2. [x] Backend: confirmar que `POST /api/login` y `POST /api/register` siguen funcionando (suite `AuthTest` en verde)
3. [x] Frontend: componente `AuthModal.tsx`
4. [x] Frontend: `AuthModalContext.tsx` + provider + hook
5. [x] Frontend: `LoginPage.tsx` / `RegisterPage.tsx` → shims que abren el modal
6. [x] Frontend: sustituir todos los enlaces/`navigate` a `/login` y `/register` por `openModal()`
7. [x] Frontend: manejar el retorno `?auth=success` de Google (`refreshUser` + cerrar modal)
8. [x] Documentación (`docs/023-auth-modal-google.md`), `php artisan test` completo, commit

---

## Nota de verificación

Tareas 3–7 verificadas con Playwright contra la app real (Docker + Nginx en `http://localhost`):
apertura/cierre del modal (header, backdrop, X), cambio de tab con fade, blur del overlay
(`backdrop-filter: blur(8px)` confirmado por `getComputedStyle`), redirect real a
`accounts.google.com` con los parámetros OAuth correctos, viewport móvil (375px), `/login` y
`/perfil` sin sesión, y el handler de `?auth=success`. No se completó un login real de Google (requiere
credenciales de una cuenta real) — todo lo verificable sin eso está confirmado.
