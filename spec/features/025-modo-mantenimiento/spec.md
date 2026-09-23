# 025 — Modo mantenimiento

## Spec

### Qué hace
Añade un switch en el panel de administrador que oculta a los clientes **solo los
módulos relacionados con la venta de productos**: la página de Tienda (`/tienda`) y
la sección "Novedades / En oferta" de la portada. En su lugar ven una pantalla de
mantenimiento (con el minijuego que ya existe en la 404). El resto del sitio —
artistas, mapa, fichas de producto ya enlazadas, checkout, login, el panel de
admin — sigue funcionando con normalidad. El estado se persiste en base de datos,
no en memoria — sobrevive a un reinicio del contenedor o a que otro admin entre
desde otro sitio.

> **Corrección de alcance** (tras la primera entrega): la primera versión de esta
> feature apagaba el sitio entero — todas las rutas públicas, no solo las de venta.
> Era un malentendido del encargo, no lo que se pidió. Esta spec y el código ya
> reflejan el alcance correcto; ver la nota de la Decisión técnica 2 más abajo.

### Criterios de aceptación
- [x] Toggle visible en el admin (`/admin/ajustes`), con confirmación explícita antes
      de **activar** (no hace falta confirmar al desactivar)
- [x] El estado persiste en la tabla `settings` — reiniciar el contenedor backend no
      lo resetea
- [x] Con mantenimiento activo, `/tienda` muestra la pantalla de mantenimiento en
      vez del listado de productos
- [x] Con mantenimiento activo, la sección "Novedades / En oferta" de la portada
      (`/`) muestra un aviso en línea en vez de la grid de productos — el resto de
      la home (hero, artistas/bola, newsletter) no se ve afectado
- [x] Todas las demás rutas (login, registro, artistas, mapa, fichas de producto
      individuales, checkout, pedidos propios, perfil, panel de admin, etc.) siguen
      funcionando exactamente igual, activo o no
- [x] La pantalla de mantenimiento de `/tienda` reutiliza el componente del
      minijuego de la 404 (`TroncodriloGame.tsx`) — mismo canvas y lógica, solo
      cambia el copy alrededor
- [x] `/admin/*` sigue siendo accesible y funcional con mantenimiento activo (incluida
      la posibilidad de desactivarlo desde ahí)
- [x] Con mantenimiento activo, los endpoints de catálogo que usan `/tienda` y
      "Novedades" (`/api/products`, `/api/products/new`, `/api/categories`,
      `/api/promotions/active`, `/api/collaborators`) devuelven 503 — no solo el
      frontend deja de mostrarlos, el acceso directo a la API también queda
      bloqueado. El resto de la API (incluida la ficha de producto individual,
      `/api/products/{slug}`) no se ve afectada
- [x] Un cliente con la SPA ya abierta antes de activar el mantenimiento deja de
      poder navegar/comprar en `/tienda` sin necesidad de recargar — el frontend lo
      detecta solo (cambio de ruta, polling, o al instante si su siguiente petición
      choca con el middleware)
- [x] Login, registro, `/api/user`, checkout, el webhook de Stripe y el propio
      endpoint de estado de mantenimiento siguen respondiendo con mantenimiento
      activo
- [x] `NotFoundPage.tsx` (la 404) sigue funcionando exactamente igual tras extraer el
      juego a su propio componente — sin regresión

### Fuera de alcance
- Vista previa del sitio real para admins en `/tienda` mientras navegan fuera de
  `/admin` durante mantenimiento — con el flag activo ven la misma pantalla que
  cualquier visitante, ver decisión técnica
- Mensaje de mantenimiento personalizable desde el admin (el copy queda fijo en el
  frontend, no editable vía UI) — no se pidió y la tabla `settings` no obliga a esto,
  se puede añadir después sin rehacer nada
- Programar mantenimiento (activar/desactivar en una fecha futura) — solo on/off manual
- Bloquear también la ficha de producto individual (`/producto/:slug`) o el
  checkout — explícitamente fuera de lo pedido ("solo la página de tienda y la
  sección de novedades"); un enlace directo a un producto sigue siendo comprable
  durante el mantenimiento

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

**Alcance del middleware — corregido**: la primera versión envolvía todo el bloque
de rutas públicas/de cliente (catálogo, checkout, pedidos propios, fanfics,
preorders, newsletter, banners, envíos, hero) — apagaba el sitio entero, no solo la
venta. Corregido a un grupo mucho más pequeño y explícito en `routes/api.php`, que
contiene exactamente lo que usan `/tienda` y "Novedades" y nada más:
```php
Route::middleware('maintenance')->group(function () {
    Route::get('/products', ...);       // StorePage
    Route::get('/products/new', ...);   // Novedades (home)
    Route::get('/categories', ...);     // filtro de StorePage
    Route::get('/promotions/active', ...); // tab "En oferta" (home)
    Route::get('/collaborators', ...);  // tab "Colaboradores" de StorePage
});
```
`/api/products/{slug}` (ficha de producto) queda **fuera** a propósito, junto con
todo lo demás — checkout, pedidos, artistas, fanfics, preorders, newsletter,
banners, envíos, hero, y por supuesto el grupo admin completo (incluido su propio
login, o nadie podría autenticarse para desactivarlo), `/api/login`, `/api/register`,
`/api/user`, `/api/stripe/webhook`, `/api/health`, `/api/maintenance-status` y
`/api/admin/maintenance`.

### Decisión técnica 3 — el frontend no solo comprueba al montar
Con un solo chequeo al montar la app, un cliente que ya tenía la SPA abierta cuando
se activa el mantenimiento podría seguir navegando y comprando en `/tienda` durante
el incidente — justo el caso que motiva el switch. `MaintenanceContext` recomprueba
en tres capas:
1. Al montar la app
2. En cada cambio de ruta (`useLocation` como dependencia)
3. Polling cada 15s (más agresivo que los 60s de `NotificationBell` — aquí el coste
   de tardar en cortar es un cliente comprando durante una incidencia activa, no solo
   un contador desactualizado)

Además, un interceptor de respuesta en `lib/axios.ts` detecta cualquier 503 con la
forma `{ maintenance: true }` (lo que devuelve el middleware) y dispara un evento
(`window.dispatchEvent`) que `MaintenanceContext` escucha para pasar a `active` al
instante — sin esperar al siguiente poll.

### Decisión de alcance — admins ven la misma pantalla que los clientes en `/tienda`
No se implementa "vista previa" del sitio real para admins navegando `/tienda` fuera
del panel — el gate del frontend comprueba solo el flag, no el rol. Es lo mínimo que
pide el criterio de aceptación ("panel accesible") sin inventar un requisito no
pedido; añadir la vista previa después es un cambio pequeño y localizado si hace
falta.

### Backend (Laravel)
- Migración `settings` (`key` string primary/unique, `value` text nullable, timestamps)
- `Setting` model — `Setting::get(string $key, $default = null)`, `Setting::set(string $key, $value)`
- `CheckMaintenanceMode` middleware — 503 JSON si `Setting::get('maintenance_mode')`
  es true, aplicado como grupo explícito solo sobre los 5 endpoints de catálogo
  listados arriba (no como exclusión sobre un grupo grande)
- `GET /api/maintenance-status` (público) → `{ active: bool }`
- `PUT /api/admin/maintenance` (dentro del grupo admin existente) → togglea el flag

### Frontend (React)
- `TroncodriloGame.tsx` — extraído de `NotFoundPage.tsx` tal cual (canvas, física,
  overlays, puntuación, mensajes de game over), sin cambios de comportamiento
- `NotFoundPage.tsx` — pasa a usar `<TroncodriloGame />` en vez de tener la lógica inline
- `MaintenancePage.tsx` — mismo patrón que `NotFoundPage.tsx`, copy de mantenimiento
  en vez de 404, sin el link "volver al inicio"; solo se monta para `/tienda`
- `MaintenanceContext.tsx` — consulta `GET /api/maintenance-status` al montar, en
  cada cambio de ruta y por polling de 15s
- `MaintenanceGate` (en `App.tsx`) — envuelve **únicamente** la ruta `/tienda`
  dentro del grupo `Layout`; el resto de rutas públicas, `/admin/*` y la propia home
  quedan fuera
- `ProductsSection` (dentro de `HomePage.tsx`) — consume `useMaintenance()`
  directamente y muestra un aviso en línea en vez de la grid cuando está activo, sin
  afectar al resto de la home
- `AdminSettingsPage.tsx` (`/admin/ajustes`, nueva entrada en `lib/adminNav.tsx`) —
  el toggle, con confirmación inline antes de activar (no al desactivar), copy
  actualizado para describir el alcance real (Tienda + Novedades, no todo el sitio)

---

## Tasks

1. [x] Backend: migración `settings` + modelo `Setting` + `CheckMaintenanceMode` +
   grupo `Route::middleware('maintenance')` explícito envolviendo solo los 5
   endpoints de catálogo de `/tienda` y "Novedades" + `/api/maintenance-status` +
   `/api/admin/maintenance` + `MaintenanceTest.php` (15 tests, incluido que
   `/api/products/{slug}`, artistas, checkout, etc. NO se bloquean)
2. [x] Frontend: extraer `TroncodriloGame.tsx` de `NotFoundPage.tsx` — refactor puro,
   verificado sin regresión
3. [x] Frontend: `MaintenanceContext.tsx` (montaje + cambio de ruta + polling 15s) +
   interceptor en `lib/axios.ts` para el corte instantáneo + `MaintenancePage.tsx`
4. [x] Frontend: `MaintenanceGate` cableado en `App.tsx`, aplicado solo a `/tienda`
5. [x] Frontend: `AdminSettingsPage.tsx` + entrada en el sidebar, toggle con
   confirmación inline al activar; `ProductsSection` de `HomePage.tsx` gateada
   directamente con `useMaintenance()`
6. [x] Verificación funcional (Playwright: home normal salvo Novedades, `/tienda`
   con la pantalla completa, resto de rutas sin afectar, 503 solo en los 5
   endpoints de catálogo) + `php artisan test` (64 passed, mismos 19 fallos
   preexistentes de siempre) + QA manual + commit + push
