# Implementación Feature 001 — Autenticación

Registro de decisiones técnicas y pasos ejecutados durante la implementación.

---

## Task 1 — Migración: columna `role` en `users`

**Archivo:** `src/backend/database/migrations/2026_07_01_081745_add_role_to_users_table.php`

- Se añade `role ENUM('user','admin') DEFAULT 'user'` posicionada después de `password`.
- El `down()` usa `dropColumn('role')` para rollback limpio.
- Ejecutada con `docker compose exec backend php artisan migrate` — OK.

---

## Task 2 — Configuración de Sanctum, CORS y sesión

### `config/cors.php` (archivo nuevo)

- No existía; los valores por defecto del framework tenían `supports_credentials: false` y `allowed_origins: *`, incompatibles con Sanctum SPA cookie-based.
- Se crea con `supports_credentials: true` y `allowed_origins: ['http://localhost']`.
- `paths` cubre `api/*` y `sanctum/csrf-cookie`.
- **Por qué no `*` en allowed_origins:** el estándar CORS prohíbe `*` junto a `supports_credentials: true`; el navegador rechazaría la cookie.

### `.env`

- `SESSION_DOMAIN=localhost` — necesario para que la cookie de sesión sea válida en `localhost`.
- `SANCTUM_STATEFUL_DOMAINS=localhost` — indica a Sanctum que trate las peticiones desde `localhost` como SPA (stateful), activando el flujo cookie + CSRF.

### Decisión de arquitectura

React y Laravel se sirven ambos bajo `http://localhost` (mismo origen vía Nginx proxy), por lo que las peticiones SPA→API son same-origin. CORS técnicamente no se activa, pero la config explícita protege frente a cualquier variación futura del entorno (ej. Vite en puerto distinto durante desarrollo sin Docker).

### Verificación

```
docker compose exec backend php artisan config:show sanctum
# stateful ⇁ 0 → localhost  ✓
```

---

## Task 3 — Form Requests: `RegisterRequest` y `LoginRequest`

**Archivos:**
- `src/backend/app/Http/Requests/RegisterRequest.php`
- `src/backend/app/Http/Requests/LoginRequest.php`

### RegisterRequest — reglas

| Campo      | Reglas                                          |
|------------|------------------------------------------------|
| `name`     | required, string, max:255                       |
| `email`    | required, string, email, max:255, unique:users  |
| `password` | required, string, min:8, confirmed              |

- `confirmed` valida que el campo `password_confirmation` coincida, estándar Laravel.
- `unique:users,email` cubre el criterio de aceptación "email único".

### LoginRequest — reglas

| Campo      | Reglas                   |
|------------|--------------------------|
| `email`    | required, string, email  |
| `password` | required, string         |

- Login no valida `min:8` en password deliberadamente: si el usuario cambia su contraseña en el futuro a una más corta (via admin), el login no debe bloquearse. La autenticación real la hace `Auth::attempt()`.

### Nota

Ambos Form Requests tienen `authorize(): true` porque el control de acceso a los endpoints de auth es público por definición (nadie está autenticado aún al registrarse o hacer login).

---

---

## Task 4 — AuthController + rutas

**Archivos modificados/creados:**
- `src/backend/app/Http/Controllers/AuthController.php` (nuevo)
- `src/backend/app/Models/User.php` — `role` añadido a `$fillable`
- `src/backend/routes/api.php` — 4 endpoints registrados

### Endpoints

| Método | Ruta           | Middleware     | Acción                        |
|--------|----------------|----------------|-------------------------------|
| POST   | /api/register  | —              | Crea usuario, inicia sesión   |
| POST   | /api/login     | —              | Autentica, devuelve usuario   |
| POST   | /api/logout    | auth:sanctum   | Invalida sesión               |
| GET    | /api/user      | auth:sanctum   | Devuelve usuario autenticado  |

### Decisiones técnicas

- **`register` hace login automático:** tras crear el usuario se llama a `Auth::login()` + `session()->regenerate()`. Evita que el frontend tenga que hacer una segunda petición de login.
- **`login` devuelve 401 genérico:** no distingue entre "email no existe" y "contraseña incorrecta". Práctica estándar para no filtrar qué emails están registrados.
- **`logout` invalida toda la sesión:** `Auth::logout()` + `session()->invalidate()` + `session()->regenerateToken()`. Más seguro que solo cerrar el guard; invalida el token CSRF también.
- **`role` en `$fillable`:** necesario para que `User::create(['role' => ...])` funcione en el seeder (Task 6). El registro público nunca asigna `role` explícitamente, así que siempre toma el default `'user'` de la BD.
- **Ruta `/api/user` preexistente reemplazada:** la ruta closure original se ha sustituido por `AuthController@user` que hace lo mismo pero de forma testeable.

**Mejora futura:** `register()` devuelve el objeto `$user` completo tal como lo serializa Eloquent. Aunque `password` está en `$hidden` del modelo (no aparece en JSON), sería más limpio devolver solo los campos necesarios (`id`, `name`, `email`, `role`) usando un API Resource (`UserResource`). Pendiente para cuando se defina el contrato de respuesta definitivo de la API.

---

## Task 5 — Middleware `EnsureUserIsAdmin`

**Archivos creados/modificados:**
- `src/backend/app/Http/Middleware/EnsureUserIsAdmin.php` (nuevo)
- `src/backend/bootstrap/app.php` — alias `'admin'` registrado

### Lógica

Comprueba `$request->user()?->role !== 'admin'`. El operador nullsafe `?->` cubre el caso (de error de configuración) en que el middleware se aplique sin `auth:sanctum` previo: devolvería 403 en lugar de lanzar una excepción. En uso correcto siempre van encadenados: `->middleware(['auth:sanctum', 'admin'])`.

### Registro del alias

En Laravel 12 los alias de middleware se declaran en `bootstrap/app.php` con `$middleware->alias([...])`, no en un array `$routeMiddleware` como en Laravel 10. El alias `'admin'` es el nombre corto que se usará en las definiciones de rutas.

---

## Task 6 — Seeder de usuario admin

**Archivos creados/modificados:**
- `src/backend/database/seeders/AdminUserSeeder.php` (nuevo)
- `src/backend/database/seeders/DatabaseSeeder.php` — reemplaza el User::factory() de ejemplo

### Credenciales de prueba

| Campo    | Valor                     |
|----------|---------------------------|
| email    | admin@troncodrilo.test    |
| password | password                  |
| role     | admin                     |

### Decisiones

- `firstOrCreate` hace el seeder idempotente: `db:seed` se puede repetir sin duplicar ni lanzar error.
- `Hash::make()` explícito aunque el cast `hashed` del modelo lo haría automáticamente: en seeders es preferible ser explícito para que el código sea legible sin conocer los casts del modelo.
- `DatabaseSeeder` limpio: se elimina el `User::factory()` de ejemplo que venía por defecto en Laravel.
- Ejecución: `docker compose exec backend php artisan db:seed --class=AdminUserSeeder` (o sin `--class` para correr todos).

---

## Task 7 — Tests Feature

**Archivo:** `src/backend/tests/Feature/AuthTest.php`

### Tests implementados (4/4 pasan)

| Test | Qué verifica |
|------|-------------|
| `test_user_can_register` | Status 201, estructura JSON con `role`, `role='user'` en BD |
| `test_user_can_login` | Status 200, estructura JSON correcta |
| `test_login_fails_with_wrong_credentials` | Status 401, mensaje genérico |
| `test_admin_route_returns_403_for_non_admin` | Status 403, mensaje `Forbidden.` |

### Gotchas encontrados y resueltos

**1. `EnsureFrontendRequestsAreStateful` no estaba en el grupo `api`**

En Laravel 12, `php artisan install:api` ya **no** añade `EnsureFrontendRequestsAreStateful` al grupo `api` automáticamente (cambio respecto a Laravel 10/11). Sin ese middleware, Sanctum nunca inyecta `StartSession` en las rutas API, por lo que `$request->session()` lanza `RuntimeException: Session store not set on request`.

Solución: añadir a `bootstrap/app.php`:
```php
$middleware->prependToGroup('api', EnsureFrontendRequestsAreStateful::class);
```

Esto también era necesario para que el flujo SPA funcionase en producción, no solo en tests. Era una pieza faltante de la Task 2.

**2. `role` ausente en la respuesta JSON de `register`**

`User::create(['name', 'email', 'password'])` sin pasar `role` aplica el default a nivel de BD en el INSERT, pero el objeto Eloquent devuelto no tiene el atributo cargado en memoria. La respuesta JSON de `register()` no incluía `role`.

Solución: declarar `protected $attributes = ['role' => 'user']` en el modelo `User`. Así el atributo existe en memoria desde la construcción, antes del INSERT, independientemente de si se pasa explícitamente o no.

**3. Helper `fromBrowser()` en tests**

`EnsureFrontendRequestsAreStateful` detecta peticiones stateful comprobando que el header `Origin` o `Referer` coincida con `SANCTUM_STATEFUL_DOMAINS`. Los tests no envían esos headers por defecto. Se añadió el helper privado `fromBrowser()` que añade `Origin: http://localhost` para activar el middleware en el entorno de test, replicando el comportamiento real del navegador.

**4. Ruta admin inline en test**

Como no existe todavía ninguna ruta protegida con `['auth:sanctum', 'admin']` en `routes/api.php`, el test la define inline con `Route::middleware(...)->get(...)`. Esto evita contaminar el archivo de rutas con endpoints de test.

---

## Tasks 8 y 9 — React Router + Páginas Login/Register

**Archivos creados/modificados:**
- `src/frontend/src/index.css` — bloque `@theme` con la paleta de colores
- `src/frontend/src/App.tsx` — BrowserRouter + Routes (`/login`, `/register`, `/`, `*`)
- `src/frontend/src/pages/LoginPage.tsx` (nuevo)
- `src/frontend/src/pages/RegisterPage.tsx` (nuevo)

### Paleta definida en `@theme` (Tailwind v4)

En Tailwind v4, los colores custom se definen con `@theme` en el CSS principal. Genera automáticamente utilidades `bg-primary`, `text-ink`, `ring-primary`, `text-ink/50` (con opacidad), etc. No requiere `tailwind.config.js`.

### Validación

- `LoginPage`: validación global (campos vacíos) + errores de API (401 → mensaje genérico)
- `RegisterPage`: validación campo a campo con errores inline; errores 422 del servidor mapeados al campo correspondiente usando `err.response.data.errors`

### Gotcha: errores TS en VSCode

`react-router-dom` se instala dentro del contenedor Docker. VSCode no ve `node_modules` local → muestra errores TS 2307. El build real (`npm run build` en el contenedor) compila limpio. Solución si molesta: `npm install react-router-dom` también en el host local.

### Gotcha: Tailwind v4 + `@tailwindcss/vite` no detecta archivos nuevos en dev

Con `@tailwindcss/vite`, Tailwind construye el CSS en desarrollo a partir del grafo de módulos de Vite. Si el dev server ya estaba corriendo cuando se añadieron nuevos archivos (`src/pages/`), el CSS en vivo no incluía sus clases — las páginas se veían sin estilos (solo texto plano). El build de producción sí funcionaba porque reconstruye el grafo completo desde cero.

**Solución:** añadir `@source "./**/*.{ts,tsx,html}"` en `index.css` para que Tailwind escanee el directorio de forma explícita, independientemente del estado del grafo. Reiniciar el contenedor frontend aplica el cambio al dev server.

```css
@import "tailwindcss";
@source "./**/*.{ts,tsx,html}";
```

Regla de oro: en proyectos con `@tailwindcss/vite` + Docker, añadir `@source` desde el inicio para evitar este problema al crear nuevos directorios.

### Decisión: csrf-cookie en cada página

La llamada a `GET /sanctum/csrf-cookie` se hace en cada submit de LoginPage y RegisterPage. En Task 10 se centralizará dentro de `useAuth` para que solo ocurra una vez al montar la app.

---

## Task 10 — `useAuth` hook + `AuthContext`

**Archivos creados/modificados:**
- `src/frontend/src/context/AuthContext.tsx` (nuevo)
- `src/frontend/src/hooks/useAuth.ts` (nuevo)
- `src/frontend/src/App.tsx` — envuelto con `<AuthProvider>`
- `src/frontend/src/pages/LoginPage.tsx` — usa `useAuth().login()`
- `src/frontend/src/pages/RegisterPage.tsx` — usa `useAuth().register()`

### Decisiones

- **Context API sobre Zustand:** no requiere dependencia nueva. Para estado de sesión en el MVP es suficiente. La tech-stack lo dejaba abierto; se documenta aquí como decisión tomada.
- **`csrf-cookie` una sola vez al montar `AuthProvider`:** centralizado en `useEffect` de `AuthProvider`, no en cada submit. Encadenado con `GET /api/user` para rehidratar la sesión si el usuario ya tenía cookie válida (page refresh no pierde la sesión).
- **`loading: true` inicial:** `ProtectedRoute` (Task 11) espera a que `loading` sea `false` antes de decidir si redirigir — evita el flash de redirect en page refresh con sesión activa.
- **`useAuth.ts` como re-export de un archivo:** desacopla el import de las páginas de la ruta del contexto. Si se migra a Zustand, solo cambia ese fichero.
- **`React.FormEvent<HTMLFormElement>` en lugar de `React.FormEvent`:** en React 19, `React.FormEvent` sin genérico está deprecado (hint TS 6385). Corregido en ambas páginas.

---

## Task 11 — `ProtectedRoute` y `AdminRoute`

**Archivos creados/modificados:**
- `src/frontend/src/components/ProtectedRoute.tsx` (nuevo)
- `src/frontend/src/components/AdminRoute.tsx` (nuevo)
- `src/frontend/src/App.tsx` — rutas anidadas con ejemplos placeholder

### Patrón de uso (React Router v6)

```tsx
// Requieren sesión activa → redirigen a /login si no hay usuario
<Route element={<ProtectedRoute />}>
  <Route path="/perfil"  element={<PerfilPage />} />
  <Route path="/pedidos" element={<PedidosPage />} />
</Route>

// Requieren role=admin → redirigen a / si no es admin
<Route element={<AdminRoute />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>
```

### Decisiones

- **`<Outlet />`** en lugar de `children`: estándar de React Router v6 para rutas wrapper/guard.
- **`if (loading) return null`** en ambos componentes: evita el flash de redirect mientras `AuthProvider` comprueba la sesión al arrancar (el `GET /api/user` del mount). En cuanto `loading` pasa a `false`, el componente renderiza la decisión correcta.
- **`AdminRoute` redirige a `/`** (no a `/login`): si un usuario autenticado sin rol admin llega a `/admin`, ya tiene sesión — redirigirle a login sería confuso. `ProtectedRoute` debe estar por encima en la jerarquía de rutas de admin para garantizar que solo usuarios autenticados lleguen a `AdminRoute`.

---

## Task 12 — Verificación de criterios de aceptación

Todos los criterios verificados. Estado final:

| # | Criterio | Verificación |
|---|---|---|
| 1 | Registro con nombre, email y contraseña | Manual en `/register` + test `test_user_can_register` ✓ |
| 2 | Login y sesión persistente (cookie httpOnly) | Manual en `/login` + test `test_user_can_login` ✓ |
| 3 | Cerrar sesión | Botón en `HomePage` → `useAuth().logout()` → `POST /api/logout` ✓ |
| 4 | Contraseñas con hash bcrypt | Cast `hashed` en `User.php`; columna inicia `$2y$` en BD ✓ |
| 5 | Rutas protegidas redirigen a `/login` | Verificado en incógnito: `/perfil` → redirect `/login` ✓ |
| 6 | Endpoints admin devuelven 403 sin `role=admin` | Test `test_admin_route_returns_403_for_non_admin` + middleware `EnsureUserIsAdmin` ✓ |
| 7 | Admin solo vía seeder, no registro público | `AdminUserSeeder` crea `admin@troncodrilo.test`; formulario no expone campo `role` ✓ |
| 8 | Validación: email único, formato, min 8 chars | `RegisterRequest` + validación client-side en `RegisterPage` ✓ |

**Nota criterio 5:** el primer test falló porque había una sesión activa de pruebas anteriores (el `register()` hace `Auth::login()` automáticamente). Solución: probar en ventana incógnito. Documentado como gotcha de entorno.

---

## Resumen final de la feature

### Archivos backend creados/modificados

| Archivo | Tipo |
|---|---|
| `database/migrations/2026_07_01_*_add_role_to_users_table.php` | Migración |
| `config/cors.php` | Config nueva |
| `.env` | `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` |
| `bootstrap/app.php` | `EnsureFrontendRequestsAreStateful` + alias `admin` |
| `app/Models/User.php` | `role` en `$fillable` + `$attributes` default |
| `app/Http/Requests/RegisterRequest.php` | Form Request nuevo |
| `app/Http/Requests/LoginRequest.php` | Form Request nuevo |
| `app/Http/Controllers/AuthController.php` | Controlador nuevo |
| `app/Http/Middleware/EnsureUserIsAdmin.php` | Middleware nuevo |
| `database/seeders/AdminUserSeeder.php` | Seeder nuevo |
| `database/seeders/DatabaseSeeder.php` | Actualizado |
| `routes/api.php` | 4 endpoints registrados |
| `tests/Feature/AuthTest.php` | 4 tests Feature |

### Archivos frontend creados/modificados

| Archivo | Tipo |
|---|---|
| `src/index.css` | `@theme` paleta + `@source` Tailwind v4 |
| `src/App.tsx` | BrowserRouter + AuthProvider + rutas |
| `src/context/AuthContext.tsx` | Context + AuthProvider + AuthUser |
| `src/hooks/useAuth.ts` | Hook re-export |
| `src/pages/LoginPage.tsx` | Página nueva |
| `src/pages/RegisterPage.tsx` | Página nueva |
| `src/pages/HomePage.tsx` | Página nueva con logout |
| `src/components/ProtectedRoute.tsx` | Guard nuevo |
| `src/components/AdminRoute.tsx` | Guard nuevo |

### Tests

```
PASS  Tests\Feature\AuthTest
✓ user can register          (6.41s)
✓ user can login             (0.42s)
✓ login fails with wrong credentials  (0.34s)
✓ admin route returns 403 for non admin  (0.15s)

Tests: 4 passed (15 assertions)
```

## Pendiente
- Task 5: Middleware `EnsureUserIsAdmin`
- Task 6: Seeder admin
- Task 7: Tests Feature
- Tasks 8–11: Frontend (React Router, páginas, useAuth, ProtectedRoute)
- Task 12: Verificación criterios de aceptación
