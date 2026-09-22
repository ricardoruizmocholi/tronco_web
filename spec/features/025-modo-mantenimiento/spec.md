# 025 — Modo mantenimiento

## Spec

### Qué hace
Añade un switch en el panel de administrador que pone la tienda entera en modo
mantenimiento: los clientes ven una pantalla de mantenimiento (con el minijuego que
ya existe en la 404) en vez del sitio normal, mientras el panel de admin sigue siendo
accesible para poder desactivarlo. El estado se persiste en base de datos, no en
memoria — sobrevive a un reinicio del contenedor o a que otro admin entre desde otro
sitio.

### Criterios de aceptación
- [x] Toggle visible en el admin (`/admin/ajustes`), con confirmación explícita antes
      de **activar** (no hace falta confirmar al desactivar)
- [x] El estado persiste en la tabla `settings` — reiniciar el contenedor backend no
      lo resetea
- [x] Con mantenimiento activo, cualquier ruta pública de la tienda (`/`, `/tienda`,
      `/producto/:slug`, `/login`, etc.) muestra la pantalla de mantenimiento en vez
      del contenido normal
- [x] La pantalla de mantenimiento reutiliza el componente del minijuego de la 404
      (`TroncodriloGame.tsx`) — mismo canvas y lógica, solo cambia el copy alrededor
- [x] `/admin/*` sigue siendo accesible y funcional con mantenimiento activo (incluida
      la posibilidad de desactivarlo desde ahí)
- [x] Con mantenimiento activo, las rutas públicas de la API devuelven 503 — no solo
      el frontend deja de mostrarlas, el acceso directo a la API también queda
      bloqueado
- [x] Un cliente con la SPA ya abierta antes de activar el mantenimiento deja de
      poder navegar/comprar sin necesidad de recargar — el frontend lo detecta solo
      (cambio de ruta, polling, o al instante si su siguiente petición choca con el
      middleware)
- [x] Login, registro, `/api/user`, el webhook de Stripe y el propio endpoint de
      estado de mantenimiento seguían respondiendo con mantenimiento activo (ver
      decisión técnica más abajo — si no, un admin sin sesión se queda sin forma de
      entrar a desactivarlo, o un pago en curso se pierde)
- [x] `NotFoundPage.tsx` (la 404) sigue funcionando exactamente igual tras extraer el
      juego a su propio componente — sin regresión

### Fuera de alcance
- Vista previa del sitio real para admins mientras navegan fuera de `/admin` durante
  mantenimiento — con el flag activo ven la misma pantalla que cualquier visitante,
  ver decisión técnica
- Mensaje de mantenimiento personalizable desde el admin (el copy queda fijo en el
  frontend, no editable vía UI) — no se pidió y la tabla `settings` no obliga a esto,
  se puede añadir después sin rehacer nada
- Programar mantenimiento (activar/desactivar en una fecha futura) — solo on/off manual
- Modo mantenimiento parcial (por sección) — es todo o nada

---

## Plan

### Decisión técnica 1 — dónde vive el flag: tabla `settings`, no `Cache::forever()`
`CACHE_STORE=database` ya persiste en MySQL sin migración nueva, pero se descarta:
un `Cache::clear()` ajeno al motivo por el que se ejecute apagaría el mantenimiento
sin que nadie lo pidiera — riesgo silencioso inaceptable para un flag que decide si
la tienda es alcanzable. Tabla `settings` (`key` único, `value`, timestamps) +
modelo `Setting` con `get()`/`set()` estáticos — además sirve para cualquier flag
futuro.

### Decisión técnica 2 — dónde se aplica el corte: middleware + endpoint público, los dos
Ninguno de los dos por separado cumple lo pedido:
- Solo frontend: la API sigue respondiendo a acceso directo (curl/Postman/devtools)
  — no protege nada si el motivo de activar mantenimiento es algo delicado en el
  backend
- Solo middleware sin aviso al frontend: la SPA cargaría normal y cada fetch
  fallaría suelto, no la pantalla de mantenimiento pedida

**Alcance del middleware — revisado**: en vez de una lista de exclusión sobre el
grupo `api` completo (riesgo: una ruta nueva que alguien olvide añadir a la lista
queda bloqueada por defecto), `maintenance` es un middleware con alias que se aplica
como grupo explícito y visible en `routes/api.php`, envolviendo solo el bloque de
rutas públicas/de cliente (catálogo, checkout, pedidos propios, fanfics de usuario,
preorders, newsletter, banners, envíos, hero). Todo lo que se deja fuera de ese
`Route::middleware('maintenance')->group(...)` queda protegido por defecto, sin
necesidad de recordar excluirlo:
- Grupo admin completo (incluido su propio login vía `auth:sanctum` + `admin`) — si
  no, nadie puede autenticarse para desactivarlo
- `/api/login`, `/api/register`, `/api/user` (grupo `auth:sanctum` de perfil/logout)
- `/api/stripe/webhook` — un checkout iniciado justo antes de activar el
  mantenimiento tiene que poder completarse vía webhook, o el pedido queda a medias
- `/api/health` y el `/up` de Laravel
- `/api/maintenance-status` (el nuevo endpoint público) y `/api/admin/maintenance`
  (el toggle) — ninguno de los dos puede depender de sí mismo

### Decisión técnica 3 — el frontend no solo comprueba al montar
Con un solo chequeo al montar la app, un cliente que ya tenía la SPA abierta cuando
se activa el mantenimiento podría seguir navegando y comprando durante el incidente
— justo el caso que motiva el switch. `MaintenanceContext` recomprueba en tres
capas:
1. Al montar la app
2. En cada cambio de ruta (`useLocation` como dependencia)
3. Polling cada 15s (más agresivo que los 60s de `NotificationBell` — aquí el coste
   de tardar en cortar es un cliente comprando durante una incidencia activa, no solo
   un contador desactualizado)

Además, un interceptor de respuesta en `lib/axios.ts` detecta cualquier 503 con la
forma `{ maintenance: true }` (lo que devuelve el middleware) y dispara un evento
(`window.dispatchEvent`) que `MaintenanceContext` escucha para pasar a `active` al
instante — sin esperar al siguiente poll. Esto cierra el hueco exacto que señalas:
una petición bloqueada por el middleware corta la sesión del cliente en el momento
en que ocurre, no en el próximo ciclo de sondeo.

### Decisión de alcance — admins ven la misma pantalla que los clientes fuera de `/admin`
No se implementa "vista previa" del sitio real para admins navegando fuera del
panel — el gate del frontend comprueba solo el flag, no el rol. Es lo mínimo que
pide el criterio de aceptación ("panel accesible") sin inventar un requisito no
pedido; añadir la vista previa después es un cambio pequeño y localizado si hace
falta.

### Backend (Laravel)
- Migración `settings` (`key` string primary/unique, `value` text nullable, timestamps)
- `Setting` model — `Setting::get(string $key, $default = null)`, `Setting::set(string $key, $value)`
- `CheckMaintenanceMode` middleware — 503 JSON si `Setting::get('maintenance_mode')`
  es true y la ruta no está en la lista de exclusión
- `GET /api/maintenance-status` (público) → `{ active: bool }`
- `PUT /api/admin/maintenance` (dentro del grupo admin existente) → togglea el flag

### Frontend (React)
- `TroncodriloGame.tsx` — extraído de `NotFoundPage.tsx` tal cual (canvas, física,
  overlays, puntuación, mensajes de game over), sin cambios de comportamiento;
  recibe el copy de alrededor como props, no como parte del componente
- `NotFoundPage.tsx` — pasa a usar `<TroncodriloGame />` en vez de tener la lógica inline
- `MaintenancePage.tsx` — mismo patrón que `NotFoundPage.tsx`, copy de mantenimiento
  en vez de 404, sin el link "volver al inicio" (no hay a dónde volver — todo está
  en mantenimiento)
- `MaintenanceContext.tsx` — consulta `GET /api/maintenance-status` una vez al montar
- `MaintenanceGate` (en `App.tsx`) — envuelve las rutas públicas (login/register/404/
  `Layout`), no envuelve el grupo `AdminRoute`+`AdminLayout`
- `AdminSettingsPage.tsx` (`/admin/ajustes`, nueva entrada en `lib/adminNav.tsx`) —
  el toggle, con confirmación inline antes de activar (no al desactivar)

---

## Tasks

1. [x] Backend: migración `settings` + modelo `Setting` + `CheckMaintenanceMode` +
   reestructurar `routes/api.php` para que las rutas públicas/de cliente queden
   dentro de un grupo `Route::middleware('maintenance')` explícito (moviendo
   `/health` y `/stripe/webhook` fuera de ese bloque) + `/api/maintenance-status` +
   `/api/admin/maintenance` + `MaintenanceTest.php` (11 tests)
2. [x] Frontend: extraer `TroncodriloGame.tsx` de `NotFoundPage.tsx` — refactor puro,
   verificado sin regresión
3. [x] Frontend: `MaintenanceContext.tsx` (montaje + cambio de ruta + polling 15s) +
   interceptor en `lib/axios.ts` para el corte instantáneo + `MaintenancePage.tsx`
4. [x] Frontend: `MaintenanceGate` cableado en `App.tsx` sin afectar a `/admin/*`
5. [x] Frontend: `AdminSettingsPage.tsx` + entrada en el sidebar, toggle con
   confirmación inline al activar
6. [x] Verificación funcional (Playwright, 17/17 + verificación específica del
   corte instantáneo) + `php artisan test` (60 passed, mismos 19 fallos
   preexistentes de siempre) + QA manual + commit + push
