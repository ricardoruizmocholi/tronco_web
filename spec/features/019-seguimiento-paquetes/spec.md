# 019 — Seguimiento de Paquetes

## Spec

### Qué hace
Añade seguimiento manual de paquetes a pedidos y devoluciones. El admin
introduce a mano el número de seguimiento, el transportista y (opcionalmente)
la URL de rastreo desde el panel de pedidos/devoluciones; el cliente lo ve
en `/perfil`, en el historial de pedidos y en el estado de sus devoluciones.

No hay integración con APIs de transportistas: es un dato manual que el
admin mantiene al día.

### Dos tipos de seguimiento

- **Seguimiento de envío** (`orders.tracking_*`): el paquete que el negocio
  envía al cliente.
- **Seguimiento de devolución** (`return_requests.return_tracking_*`): el
  paquete que el cliente envía de vuelta al negocio tras una devolución
  aprobada. Solo tiene sentido a partir de `return_approved`.

### Generación automática de URL
Si el admin deja la URL vacía, se genera automáticamente a partir del
transportista seleccionado (ver `docs/019-seguimiento-paquetes.md` para el
listado de plantillas). El admin puede sobreescribirla en cualquier momento.
Transportista "Otro" no genera URL — el admin debe rellenarla a mano si
quiere ofrecer un link de rastreo.

### Criterios de aceptación

**Backend**
- [x] `orders` tiene `tracking_number`, `tracking_url`, `carrier`,
      `tracking_updated_at` (todos nullable)
- [x] `return_requests` tiene `return_tracking_number`, `return_tracking_url`,
      `return_carrier`, `return_tracking_updated_at` (todos nullable)
- [x] `PUT /api/admin/orders/{id}/tracking` (admin) guarda tracking del
      pedido y `tracking_updated_at = now()`
- [x] `PUT /api/admin/returns/{id}/tracking` (admin) guarda tracking de la
      devolución y `return_tracking_updated_at = now()`
- [x] `tracking_url` / `return_tracking_url` se validan como URL si se envían
- [x] `GET /api/orders` y `GET /api/orders/{order}` (usuario) exponen los
      campos de tracking del pedido sin cambios adicionales en el
      controlador (el modelo no tiene `$hidden`)
- [x] `GET /api/user/returns` expone `return_tracking_*` sin cambios
      adicionales en el controlador (mismo motivo)
- [x] `GET /api/admin/orders/{id}` (detalle admin) incluye los 4 campos de
      tracking en la respuesta

**Panel admin — pedidos**
- [x] Modal de detalle de pedido: sección "Seguimiento" al final
- [x] Sin tracking: formulario (transportista, número, URL opcional con
      autogeneración) + botón "Guardar seguimiento"
- [x] Con tracking: datos + copiar número + link a la URL en nueva pestaña +
      transportista + fecha de actualización + botón "Editar"

**Panel admin — devoluciones**
- [x] Modal de detalle de devolución: sección "Seguimiento del paquete de
      vuelta", visible solo cuando `status` de la devolución es `approved`,
      `received` o `refunded` (los estados en los que el cliente ya puede
      estar enviando o haber enviado el paquete de vuelta)
- [x] Mismo patrón de formulario/vista que en pedidos

**Perfil de usuario**
- [x] `/perfil` → Mis pedidos: si el pedido tiene `tracking_number`, se
      muestra transportista + número + botón "Rastrear paquete →" (nueva
      pestaña) dentro del acordeón del pedido
- [x] Si hay `tracking_number` pero no `tracking_url`, se muestra solo el
      número, sin botón
- [x] Si no hay tracking, no se muestra nada (ni "sin seguimiento")
- [x] Si la devolución del pedido (`order.return_request`) tiene
      `return_tracking_number`, se muestra junto al estado de la devolución
      con el mismo patrón (número + link "Rastrear" si hay URL)

### Fuera de alcance
- Integración con APIs de transportistas (rastreo automático, webhooks)
- Notificaciones al usuario cuando se añade/actualiza el tracking
  (post-MVP)
- Validación de que el número de seguimiento tenga el formato esperado
  por transportista

---

## Plan

### Backend

**Migraciones**
- `add_tracking_to_orders_table`: `tracking_number`, `tracking_url`,
  `carrier`, `tracking_updated_at` (todos nullable) en `orders`
- `add_tracking_to_return_requests_table`: `return_tracking_number`,
  `return_tracking_url`, `return_carrier`, `return_tracking_updated_at`
  (todos nullable) en `return_requests`

**Modelos**
- `Order`: añadir los 4 campos a `$fillable`
- `ReturnRequest`: añadir los 4 campos a `$fillable`

**Controladores**
- `AdminOrderController@updateTracking` — `PUT /api/admin/orders/{order}/tracking`
  — valida `tracking_number` (nullable string), `tracking_url` (nullable url),
  `carrier` (nullable string); guarda `tracking_updated_at = now()`; devuelve
  el pedido actualizado. También se añaden los 4 campos al array `$data` de
  `show()`
- `AdminReturnController@updateTracking` — `PUT /api/admin/returns/{return}/tracking`
  — mismo patrón sobre `return_tracking_number`, `return_tracking_url`,
  `return_carrier`, `return_tracking_updated_at`

No se tocan `OrderController` ni `ReturnRequestController`: ambos serializan
el modelo Eloquent directamente (sin `$hidden`), así que los campos nuevos
aparecen solos en `GET /api/orders`, `GET /api/orders/{order}` y
`GET /api/user/returns` en cuanto están en `$fillable`.

**Rutas** (`routes/api.php`, dentro del grupo `admin`)
- `Route::put('/orders/{order}/tracking', [AdminOrderController::class, 'updateTracking']);`
- `Route::put('/returns/{return}/tracking', [AdminReturnController::class, 'updateTracking']);`

### Frontend

**Tipos**
- `src/types/order.ts`: `tracking_number`, `tracking_url`, `carrier`,
  `tracking_updated_at` en `Order`
- `src/types/adminOrder.ts`: mismos 4 campos en `AdminOrderDetail`
- `src/types/returnRequest.ts`: `return_tracking_number`,
  `return_tracking_url`, `return_carrier`, `return_tracking_updated_at` en
  `ReturnRequest`

**API**
- `src/api/adminOrders.ts`: `updateOrderTracking(id, payload)`
- `src/api/returns.ts`: `updateReturnTracking(id, payload)`

**Lógica compartida**
- `src/lib/trackingCarriers.ts`: lista de transportistas (Correos, MRW, SEUR,
  DHL, GLS, Otro) + `buildTrackingUrl(carrier, number)` con las plantillas
  de URL por transportista
- `src/components/TrackingPanel.tsx`: componente reutilizado en los modales
  de `AdminOrdersPage` y `AdminReturnsPage`. Recibe título, datos actuales
  (`number`, `url`, `carrier`, `updatedAt`) y un `onSave` normalizado;
  resuelve el patrón "formulario si no hay datos / vista + editar si ya
  hay", la autogeneración de URL y el copy-to-clipboard del número

**Páginas modificadas**
- `AdminOrdersPage.tsx`: `TrackingPanel` al final del modal de detalle,
  conectado a `updateOrderTracking`
- `AdminReturnsPage.tsx`: `TrackingPanel` al final del modal de detalle,
  visible solo si `detail.status` es `approved`, `received` o `refunded`,
  conectado a `updateReturnTracking`
- `ProfileOrdersSection.tsx`: dentro del acordeón de cada pedido — bloque
  "Seguimiento" si hay `tracking_number` (transportista + número + link
  "Rastrear paquete →"); y junto al badge de estado de devolución, bloque
  de seguimiento de vuelta si `order.return_request.return_tracking_number`
  existe

### Dependencias
- Requiere Feature 011 (panel pedidos admin) y Feature 014
  (cancelaciones y devoluciones) completas

---

## Tasks

### Tarea 1 — Backend: migraciones y modelos
1. [x] Migración `add_tracking_to_orders_table`
2. [x] Migración `add_tracking_to_return_requests_table`
3. [x] `Order::$fillable` — añadir los 4 campos
4. [x] `ReturnRequest::$fillable` — añadir los 4 campos

### Tarea 2 — Backend: endpoints
5. [x] `AdminOrderController@updateTracking` + añadir campos a `show()`
6. [x] `AdminReturnController@updateTracking`
7. [x] Rutas en `api.php`
8. [x] Verificar que `GET /api/orders`, `GET /api/orders/{order}` y
       `GET /api/user/returns` exponen los campos nuevos sin cambios

### Tarea 3 — Frontend: panel admin pedidos
9. [x] `src/lib/trackingCarriers.ts`
10. [x] `TrackingPanel.tsx`
11. [x] `updateOrderTracking` en `src/api/adminOrders.ts`
12. [x] Tipos actualizados (`order.ts`, `adminOrder.ts`)
13. [x] Integrar `TrackingPanel` en el modal de `AdminOrdersPage.tsx`

### Tarea 4 — Frontend: panel admin devoluciones
14. [x] `updateReturnTracking` en `src/api/returns.ts`
15. [x] Tipo `ReturnRequest` actualizado
16. [x] Integrar `TrackingPanel` en el modal de `AdminReturnsPage.tsx`,
       condicionado al estado

### Tarea 5 — Frontend: /perfil — mis pedidos
17. [x] `ProfileOrdersSection.tsx`: bloque de seguimiento de envío por pedido

### Tarea 6 — Frontend: /perfil — mis devoluciones (inline)
18. [x] `ProfileOrdersSection.tsx`: bloque de seguimiento de vuelta junto al
       estado de la devolución

### Tarea 7 — Documentación y cierre
19. [x] `docs/019-seguimiento-paquetes.md`
20. [x] `php artisan test` (vía `docker compose exec backend`) — 19 fallidos / 43 pasados,
        mismos 19 fallos preexistentes de `FanficTest`/`CheckoutTest` (feature 014), sin fallos nuevos
21. [x] Verificar los criterios de aceptación uno a uno
22. [x] `git add . && git commit -m "feat: feature 019 completa — seguimiento manual de paquetes" && git push`
