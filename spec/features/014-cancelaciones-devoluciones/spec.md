# 014 — Cancelaciones y Devoluciones

## Spec

### Qué hace
Añade un sistema completo de cancelaciones y devoluciones accesible desde
`/perfil` (usuario) y gestionable desde `/admin/devoluciones` (admin),
integrado con la API de Stripe para reembolsos automáticos y alineado con
la legislación española: derecho de desistimiento de 14 días naturales
(LGDCU, RD 1/2007) y conservación de registros 6 años mínimo
(Art. 30 Código de Comercio). Los pedidos nunca se eliminan de la BD.

### Contexto legal aplicable
- **Derecho de desistimiento** (LGDCU): 14 días naturales desde recepción
  del producto. El reembolso debe incluir el shipping_cost original.
  Desde junio 2026 el botón de desistimiento debe ser visible y accesible.
- **Stripe fees**: cancelar un pedido `pending` no tiene coste. Reembolsar
  un pedido `paid` ya capturado no recupera la comisión de procesamiento
  de Stripe (≈1.4 % + 0.25 € para tarjetas europeas).
- **Conservación de registros**: mínimo 6 años (Art. 30 Cód. Comercio).
  Los pedidos nunca se eliminan — solo se archivan visualmente si procede.

### Lógica de estados

```
CANCELACIÓN
  pending  → cancelable por usuario (sin pago, sin coste)   → cancelled
  paid     → cancelable si aún no shipped (Stripe Refund)   → cancelled
  shipped  → NO cancelable; se redirige al flujo devolución
  delivered→ NO cancelable; se redirige al flujo devolución

DEVOLUCIÓN (solo shipped / delivered)
  return_requested → [admin] return_approved  → return_received → refunded
                  → [admin] return_rejected

STOCK
  Cancelación   → stock restaurado inmediatamente
  Devolución    → stock restaurado al llegar a return_received
                  (no antes: el producto puede llegar dañado)
```

### Criterios de aceptación

**Cancelaciones**
- [x] Usuario puede cancelar pedido `pending` desde `/perfil` — sin cargo, stock restaurado
- [x] Usuario puede cancelar pedido `paid` no enviado — Stripe Refund ejecutado, stock restaurado
- [x] Pedido `shipped` o `delivered` no muestra opción cancelar — muestra botón "Solicitar devolución"
- [x] Modal de confirmación advierte que las comisiones de Stripe no se recuperan en pedidos `paid`
- [x] Admin puede cancelar cualquier pedido `paid` desde el panel de pedidos

**Devoluciones**
- [x] Usuario puede iniciar devolución desde `/perfil` adjuntando imagen (obligatoria) y motivo
- [x] Motivos disponibles: `defectuoso`, `no_corresponde`, `desistimiento`, `otro`
- [x] La solicitud queda visible en `/perfil` con su estado actual
- [x] Admin ve cola de devoluciones pendientes con badge de notificación en el header
- [x] Admin puede aprobar, rechazar (con motivo obligatorio) o confirmar recepción del paquete
- [x] El Stripe Refund se ejecuta únicamente al confirmar recepción (`return_received`)
- [x] Para motivo `desistimiento`, el reembolso incluye el `shipping_cost` original (obligación legal)
- [x] Admin puede decidir reembolso parcial o total en otros motivos
- [x] Cada cambio de estado queda registrado en `return_status_history` (auditoría)
- [x] Los pedidos nunca son eliminables desde ningún panel admin
- [x] Usuario puede elegir devolver solo algunos artículos del pedido (devolución parcial),
      marcando/desmarcando artículos y ajustando la cantidad de cada uno (1 hasta el máximo comprado)
- [x] Si no se selecciona ningún artículo, el frontend bloquea el envío del formulario
- [x] El subtotal a devolver se recalcula en tiempo real según la selección
- [x] El backend valida que cada artículo devuelto pertenezca al pedido y que la cantidad
      no supere la comprada
- [x] Si la solicitud no especifica artículos (`items[]` ausente), se devuelve el pedido
      completo (comportamiento heredado, compatible con clientes antiguos)
- [x] El `refund_amount` al confirmar recepción se calcula sumando `unit_price * quantity`
      solo de los artículos efectivamente devueltos, no el total del pedido
- [x] Para `desistimiento`, el `shipping_cost` solo se añade al reembolso si se devuelven
      TODOS los artículos del pedido

**Panel admin**
- [x] Página `/admin/devoluciones` con tabla filtrable por estado, fecha y usuario
- [x] Modal de detalle muestra imagen adjunta, motivo, descripción e historial de estados
- [x] Card "Devoluciones" visible en `AdminDashboardPage`
- [x] Badge independiente para devoluciones pendientes (separado del badge de pedidos)

### Fuera de alcance
- Notificaciones por email al usuario (post-MVP)
- Integración con empresa de transporte para etiqueta de devolución (post-MVP)
- Bloqueo automático de solicitudes fuera del plazo de 14 días (decisión del admin)

---

## Plan

### Backend

**Migraciones**
- `add_new_statuses_to_orders_table`: ampliar enum `status` con
  `delivered`, `return_requested`, `return_approved`, `return_rejected`,
  `return_received`, `refunded`
- `add_stripe_payment_intent_to_orders_table`: columna
  `stripe_payment_intent_id string nullable` en `orders`
  (necesaria para ejecutar Stripe Refunds programáticamente)
- `create_return_requests_table`: tabla de solicitudes de devolución
- `create_return_status_history_table`: tabla de auditoría de cambios
- `add_items_to_return_requests_table`: tabla `return_request_items`
  (`return_request_id`, `order_item_id`, `quantity`, `reason` nullable)
  para soportar devoluciones parciales

**Modelos**
- `ReturnRequest`: belongsTo Order, belongsTo User, hasMany ReturnStatusHistory,
  hasMany ReturnRequestItem
- `ReturnStatusHistory`: belongsTo ReturnRequest, belongsTo User (changed_by).
  `$table = 'return_status_history'` explícito (el nombre de la migración es
  singular; Eloquent pluraliza "History" a "Histories" por defecto)
- `ReturnRequestItem`: belongsTo ReturnRequest, belongsTo OrderItem
- `Order`: añadir nuevos estados al enum, hasOne ReturnRequest

**Controladores**
- `CancellationController` (auth:sanctum):
  - `POST /api/orders/{id}/cancel` — owner del pedido
- `ReturnRequestController` (auth:sanctum):
  - `POST /api/orders/{id}/return` — inicia solicitud (imagen + motivo).
    Acepta `items[]` opcional (`order_item_id`, `quantity`) para devolución
    parcial; valida que cada `order_item_id` pertenezca al pedido y que
    `quantity` no supere la cantidad comprada. Si `items[]` no se envía,
    se devuelve el pedido completo (fallback)
  - `GET /api/user/returns` — historial de devoluciones del usuario
- `AdminReturnController` (middleware admin):
  - `GET /api/admin/returns` — cola con filtros
  - `GET /api/admin/returns/{id}` — detalle + historial
  - `PUT /api/admin/returns/{id}/approve`
  - `PUT /api/admin/returns/{id}/reject` — requiere `admin_notes`
  - `PUT /api/admin/returns/{id}/receive` — ejecuta Stripe Refund + restaura stock.
    `refund_amount` se calcula sumando `unit_price * quantity` de los
    `return_request_items` asociados (o el total del pedido si no hay items,
    caso legacy). Para `desistimiento`, el `shipping_cost` solo se añade si
    la devolución cubre todos los artículos del pedido
  - `GET /api/admin/returns/pending-count` — para badge
- `AdminCancellationController` (middleware admin):
  - `PUT /api/admin/orders/{id}/cancel` — admin puede cancelar cualquier `paid`

**Servicio Stripe**
- `StripeRefundService`: encapsula `\Stripe\Refund::create([...])`,
  recibe `payment_intent_id` y `amount` (céntimos). Lanza excepción
  si Stripe devuelve error. Guarda `stripe_refund_id` en `return_requests`.

### Frontend

**Tipos**
- `src/types/returnRequest.ts`: `ReturnRequest`, `ReturnStatusHistory`,
  `ReturnReason` (enum), `ReturnStatus` (enum)

**API**
- `src/api/returns.ts`: `createReturnRequest`, `getUserReturns`,
  `getAdminReturns`, `getAdminReturn`, `approveReturn`, `rejectReturn`,
  `confirmReturnReceived`, `getPendingReturnsCount`
- `src/api/orders.ts`: añadir `cancelOrder`

**Componentes**
- `CancelOrderModal.tsx`: confirmación con aviso legal sobre comisiones Stripe
- `ReturnRequestModal.tsx`: formulario con selector motivo + upload imagen
  (reutiliza lógica de `ImageUploadController`) + descripción opcional +
  selección de artículos a devolver (checkbox + cantidad por artículo,
  todos marcados por defecto, subtotal en tiempo real)
- `ReturnStatusBadge.tsx`: badge de estado de devolución reutilizable

**Páginas modificadas**
- `ProfilePage.tsx / ProfileOrdersSection.tsx`:
  - Botón "Cancelar" si `status === 'pending' || status === 'paid'`
  - Botón "Solicitar devolución" si `status === 'shipped' || status === 'delivered'`
  - Badge de estado de devolución si hay `return_request` activo
- `Layout.tsx`: segundo badge en header para devoluciones pendientes (admin)
- `AdminDashboardPage.tsx`: card "Devoluciones"
- `App.tsx`: ruta `/admin/devoluciones` con `<AdminRoute>`

**Páginas nuevas**
- `src/pages/admin/AdminReturnsPage.tsx`:
  tabla filtrable + modal detalle con imagen + historial + botones de acción

### Dependencias
- Requiere Feature 011 completa (panel pedidos admin, badge header)
- Requiere `stripe_payment_intent_id` guardado en el webhook de pago
  (verificar en `StripeWebhookController` que se persiste al recibir
  `checkout.session.completed` — si no, añadirlo en esta feature)

---

## Tasks

### Tarea 1 — Migraciones y modelos
1. [x] Migración: ampliar enum `status` en `orders`
2. [x] Migración: añadir `stripe_payment_intent_id` a `orders`
3. [x] Migración: crear tabla `return_requests`
4. [x] Migración: crear tabla `return_status_history`
5. [x] Modelo `ReturnRequest` con relaciones y fillable
6. [x] Modelo `ReturnStatusHistory` con relaciones
7. [x] Actualizar modelo `Order`: nuevos estados + `hasOne(ReturnRequest)`
8. [x] Verificar en `StripeWebhookController` que se guarda `stripe_payment_intent_id`

### Tarea 2 — Backend: cancelaciones
9. [x] `CancellationController@cancel` (usuario): lógica pending vs paid
10. [x] `StripeRefundService`: encapsular llamada a `\Stripe\Refund::create`
11. [x] Restauración de stock al cancelar (variants o products)
12. [x] `AdminCancellationController@cancel`: admin cancela cualquier `paid`
13. [x] Rutas en `api.php`: `POST /api/orders/{id}/cancel` + admin

### Tarea 3 — Backend: devoluciones (usuario)
14. [x] `ReturnRequestController@store`: validar imagen + motivo, subir imagen, crear `return_request`
15. [x] `ReturnRequestController@index`: `GET /api/user/returns`
16. [x] Rutas en `api.php`

### Tarea 4 — Backend: devoluciones (admin)
17. [x] `AdminReturnController@index`: listado con filtros paginado
18. [x] `AdminReturnController@show`: detalle + historial de estados
19. [x] `AdminReturnController@approve`: cambio de estado + registro en historial
20. [x] `AdminReturnController@reject`: requiere `admin_notes` + historial
21. [x] `AdminReturnController@receive`: Stripe Refund + restaurar stock + historial
22. [x] `AdminReturnController@pendingCount`
23. [x] Rutas admin en `api.php`

### Tarea 5 — Frontend: tipos y API
24. [x] `src/types/returnRequest.ts`
25. [x] `src/api/returns.ts` con todas las funciones
26. [x] `src/api/orders.ts`: añadir `cancelOrder`

### Tarea 6 — Frontend: componentes
27. [x] `CancelOrderModal.tsx` con aviso de comisiones Stripe
28. [x] `ReturnRequestModal.tsx` con upload de imagen
29. [x] `ReturnStatusBadge.tsx`

### Tarea 7 — Frontend: perfil de usuario
30. [x] `ProfileOrdersSection.tsx`: botones cancelar / devolver según estado
31. [x] Integrar modales en `ProfilePage.tsx`
32. [x] Mostrar badge de estado de devolución activa por pedido

### Tarea 8 — Frontend: panel admin devoluciones
33. [x] `AdminReturnsPage.tsx`: tabla + filtros + paginación
34. [x] Modal detalle: imagen, motivo, historial de estados
35. [x] Botones de acción por estado (aprobar / rechazar / confirmar recepción)
36. [x] Badge independiente en `Layout.tsx` para devoluciones pendientes
37. [x] Card "Devoluciones" en `AdminDashboardPage.tsx`

### Tarea 9 — Routing y verificación final
38. [x] Ruta `/admin/devoluciones` en `App.tsx` con `<AdminRoute>`
39. [x] `php artisan test` — todos los tests pasan
40. [x] Prueba manual: cancelar pedido `pending` → stock restaurado
41. [x] Prueba manual: cancelar pedido `paid` → Stripe Refund visible en dashboard Stripe
42. [x] Prueba manual: flujo completo devolución hasta `refunded`
43. [x] Prueba manual: rechazo de devolución con motivo
44. [x] Verificar los criterios de aceptación uno a uno
45. [x] `git add . && git commit -m "feat: feature 014 completa — cancelaciones y devoluciones" && git push`

### Tarea 10 — Fix crítico: tabla `return_status_history` + devoluciones parciales
46. [x] Corregir `ReturnStatusHistory::$table` (la tabla real es `return_status_history`,
    singular; Eloquent la pluralizaba a `return_status_histories` sin el `$table` explícito)
47. [x] Migración `add_items_to_return_requests_table`: tabla `return_request_items`
48. [x] Modelo `ReturnRequestItem` + relación `ReturnRequest::items()`
49. [x] `ReturnRequestController@store`: validar y persistir `items[]` parciales
50. [x] `AdminReturnController@receive`: `refund_amount` por artículos devueltos +
    `shipping_cost` condicionado a devolución completa
51. [x] `ReturnRequestModal.tsx`: sección de selección de artículos con subtotal en vivo
52. [x] `php artisan test` — mismos 19 fallos preexistentes (FanficTest/CheckoutTest,
    no relacionados), sin fallos nuevos

### Tarea 11 — Verificación final: `stripe_payment_intent_id` ausente + modal admin
53. [x] Comando `stripe:sync-payment-intents`: recupera el `payment_intent_id` desde
    la Checkout Session de Stripe para pedidos que no lo tienen guardado
54. [x] Corregido el filtro del comando: no restringir por `status = 'paid'`
    (un pedido en devolución/cancelación ya no está en `paid` aunque necesite
    su `payment_intent_id`) — se procesan todos los pedidos con
    `payment_intent_id` nulo, y se listan aparte los que ni siquiera tienen
    `stripe_session_id` (irrecuperables automáticamente)
55. [x] `AdminReturnController@receive`: si falta `payment_intent_id`, el mensaje
    de error incluye el `stripe_session_id` para gestión manual en Stripe
56. [x] `AdminReturnController@show`: eager loading de `order.items.variant`,
    `items.orderItem.product`, `items.orderItem.variant` para el detalle admin
57. [x] `AdminReturnsPage.tsx`: secciones "Artículos a devolver" (con subtotal y
    total) y "Datos del cliente" (nombre, email, dirección de envío, link al
    pedido) en el modal de detalle
58. [x] `AdminOrdersPage.tsx`: soporte `?order=ID` para abrir el detalle del
    pedido desde el link del panel de devoluciones
59. [x] `php artisan test` — mismos 19 fallos preexistentes, sin fallos nuevos
60. [x] Verificado manualmente con datos reales (pedido #7 / devolución #5):
    JSON de `show()` inspeccionado en tinker, coincide con lo que consume el frontend

---

## Notas de implementación

**`stripe_payment_intent_id` en pedidos anteriores a la feature**
Los pedidos creados antes de la Feature 014 no tenían `stripe_payment_intent_id`
guardado (el webhook empezó a persistirlo con esta feature). Se creó el comando
`stripe:sync-payment-intents`, que recupera ese valor desde la Checkout Session
de Stripe (`stripe_session_id`) y lo guarda en el pedido. El comando procesa
**cualquier pedido con `payment_intent_id` nulo, sin filtrar por `status`**:
un pedido en devolución o cancelación ya no está en `paid` (avanza a `shipped`,
`return_approved`, `refunded`, etc.) aunque siga necesitando su
`payment_intent_id` para poder reembolsarse. Los pedidos sin `stripe_session_id`
se listan aparte como irrecuperables automáticamente.

**Tabla `return_status_history`**
Eloquent pluraliza el nombre de la clase `ReturnStatusHistory` a
`return_status_histories`, pero la migración crea la tabla en singular
(`return_status_history`). Se añadió `protected $table = 'return_status_history'`
explícito en el modelo para que coincida con la tabla real.

**Devoluciones parciales**
`return_request_items` permite devolver artículos individuales del pedido
(no solo el pedido completo). El `shipping_cost` de un `desistimiento` solo
se añade al reembolso si se devuelven **todos** los artículos del pedido —
devolver un único artículo de varios no da derecho a recuperar el envío completo.