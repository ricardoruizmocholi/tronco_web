# 024 — Sidebar de navegación + notificaciones para el admin

## Spec

### Qué hace
Añade un shell de layout propio para el panel de administrador — sidebar fijo con
acceso a las 13 secciones existentes, y una campana de notificaciones en su cabecera
que avisa de tareas pendientes (pedidos sin gestionar, devoluciones pendientes,
preorders pendientes) con navegación directa al registro concreto al hacer click.
Hoy el admin no tiene shell propio: cada página cuelga directamente del `Layout`
público (header + footer del sitio) y `AdminDashboardPage` hace de "hub" con una
grid de tarjetas hacia cada sección.

### Secciones existentes a enlazar desde el sidebar
(de `App.tsx`, todas ya construidas — no se crea ninguna nueva)

| Sección | Ruta |
|---|---|
| Dashboard | `/admin` |
| Productos | `/admin/productos` |
| Artistas | `/admin/artistas` |
| Fanfics | `/admin/fanfics` |
| Envíos | `/admin/envios` |
| Banners | `/admin/banners` |
| Colaboradores | `/admin/colaboradores` |
| Pedidos | `/admin/pedidos` |
| Preorders | `/admin/preorders` |
| Devoluciones | `/admin/devoluciones` |
| Promociones | `/admin/promociones` |
| Hero Slides | `/admin/hero` |
| Newsletter | `/admin/newsletter` |

### Criterios de aceptación
- [x] El panel admin (todas las rutas bajo `AdminRoute`) usa un shell propio con
      sidebar fijo, no el `Layout` público
- [x] El sidebar da acceso a las 13 secciones de la tabla anterior, con el item
      activo resaltado
- [x] En móvil el sidebar se colapsa/oculta tras un botón hamburguesa, mismo patrón
      que `MobileDrawer.tsx` del sitio público
- [x] Ninguna página admin existente pierde funcionalidad al pasar a este shell
- [x] Campana con contador visible en la cabecera del panel admin
- [x] El contador refleja: pedidos con `status = pending`, devoluciones con
      `status = pending`, preorders con `status = pending`
- [x] Desplegar la campana muestra la lista de items pendientes agrupados por tipo
- [x] Click en un item de la lista navega a la sección correspondiente y abre el
      detalle exacto de ese registro (pedido, devolución o preorder) — para
      preorders, que no tiene modal de detalle propio, se resalta la fila en vez
      de forzar un modal que no existía
- [x] Un item deja de aparecer en la campana en cuanto su tarea se resuelve
      (cambia de estado) — sin paso manual de "marcar como leído"
- [x] El resto del sitio (header público, badges existentes de `Layout.tsx`) sigue
      funcionando igual que antes — ahora sobre el mismo `AdminNotificationsContext`
      compartido en vez de un polling propio

### Fuera de alcance
- Notificaciones no accionables (avisos informativos, log de actividad, anuncios)
  — todo lo que pide este encargo ya es un estado "pendiente" consultable; si en el
  futuro hace falta un tipo de notificación que no derive de un estado existente,
  eso sí necesitará una tabla `notifications` real (ver decisión técnica más abajo)
- Notificaciones push / tiempo real (WebSockets, Pusher) — se sondea por polling,
  igual que el patrón ya existente en `Layout.tsx`
- Marcar una notificación como "leída pero no resuelta" (descartar sin actuar) —
  deliberadamente no soportado, ver criterios de aceptación
- Preferencias de notificación por admin, notificaciones por email
- Tocar `AdminDashboardPage.tsx` más allá de que ahora vive dentro del nuevo shell
  (la grid de tarjetas se mantiene tal cual)

---

## Plan

### Decisión técnica: notificaciones computadas, sin tabla nueva
Dos formas de modelar esto — detalle completo con trade-offs en la propuesta hecha
antes de implementar (ver conversación / commit de esta feature). Resumen de la
decisión tomada:

**Elegido — endpoint agregado sobre el estado real (`GET /api/admin/notifications`)**:
cada vez que se pide, consulta en vivo `Order::where('status','pending')`,
`ReturnRequest::where('status','pending')` y `Preorder::where('status','pending')`,
y devuelve una lista sintética. Generaliza el patrón que ya existe en
`AdminOrderController::pendingCount()` / `AdminReturnController::pendingCount()`
(usados hoy por `Layout.tsx`), en vez de duplicar ese mecanismo con uno nuevo.

Por qué no una tabla `notifications` con `read_at`: todo lo pedido en esta feature
ya es un campo de estado existente y consultable — una tabla aparte obligaría a
mantener sincronizados dos sistemas de verdad (el `status` real del pedido/devolución
Y un flag de "leído" separado), con el riesgo de que se desincronicen si algún flujo
futuro cambia el estado sin pasar por el sitio donde se marca como leído. El criterio
de aceptación de esta feature pide explícitamente que la notificación desaparezca
"cuando se resuelve la tarea" — eso es exactamente lo que da gratis una consulta en
vivo, sin ningún flag adicional que pueda quedar desincronizado.

### Backend (Laravel)
- `AdminNotificationController@index` → `GET /api/admin/notifications`: agrega
  pedidos/devoluciones/preorders pendientes en una lista unificada
  `{ type, id, title, subtitle, created_at }`, más el total. La URL de destino
  no viaja del backend — `NotificationBell.tsx` la construye a partir de
  `type`+`id` (mapa `TYPE_ROUTE`), para no acoplar las rutas del SPA al backend
- Sin migración nueva — reutiliza las tablas `orders`, `return_requests`, `preorders`
  ya existentes

### Frontend (React)
- `AdminLayout.tsx`: nuevo shell con `<Outlet />`, sidebar fijo + cabecera con la
  campana; envuelve las rutas admin en `App.tsx` (dentro de `AdminRoute`, fuera del
  `Layout` público)
- `AdminSidebar.tsx`: nav con las 13 secciones, colapsable en móvil
- `NotificationBell.tsx`: icono + contador + dropdown con la lista, sondeo por
  polling (mismo intervalo que `Layout.tsx`, 60s)
- Navegación al detalle: cada item enlaza a `{sección}?{tipo}={id}` (p.ej.
  `/admin/pedidos?order=123`); `AdminOrdersPage.tsx` y `AdminReturnsPage.tsx` ya
  abren su modal de detalle por id (`openDetail(id)`) — solo hace falta que lean
  ese query param al montar y llamen a esa misma función. `AdminPreordersPage.tsx`
  se revisa para el mismo patrón o el equivalente que tenga

---

## Tasks

1. [x] Backend: `AdminNotificationController@index` + ruta + `AdminNotificationTest.php`
   (4 tests: agregación correcta, vacío, no-admin 403, invitado 401)
2. [x] Frontend: `AdminSidebar.tsx` (las 13 secciones vía `lib/adminNav.tsx` compartido
   con `AdminDashboardPage.tsx`, activo resaltado, colapsable en móvil)
3. [x] Frontend: `AdminLayout.tsx` (shell con sidebar + cabecera) cableado en
   `App.tsx`, rutas admin movidas fuera del `Layout` público
4. [x] Frontend: `NotificationBell.tsx` + `AdminNotificationsContext.tsx` — un único
   polling de 60s compartido con los badges de `Layout.tsx` (antes eran dos
   pollings independientes)
5. [x] Frontend: deep-link al detalle — `AdminOrdersPage.tsx` ya lo tenía
   (`?order=`, construido para otra feature); añadido `?return=` en
   `AdminReturnsPage.tsx` con el mismo patrón; `AdminPreordersPage.tsx` no tiene
   modal de detalle, así que resalta la fila (`?preorder=`) en su lugar
6. [x] Verificación funcional (Playwright contra la app real, 22/22 checks:
   sidebar, resaltado activo, móvil, campana, los 3 tipos de deep-link, badges
   públicos) + `php artisan test` (49 passed, mismos 19 fallos preexistentes de
   siempre — ninguno nuevo) + commit + push
