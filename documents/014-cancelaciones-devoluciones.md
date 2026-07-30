# 014 — Cancelaciones y Devoluciones: Decisiones de Implementación

## Arquitectura general

```
CANCELACIÓN (pending / paid no enviado)
  Usuario/Admin → POST/PUT /api/orders/{id}/cancel
  → Stripe Refund si estaba pagado, stock restaurado inmediatamente

DEVOLUCIÓN (shipped / delivered)
  Usuario → POST /api/orders/{id}/return (motivo + imagen + items[] opcional)
  → return_requests (status=pending) + return_request_items (si parcial)
  Admin   → approve / reject / receive
  → receive ejecuta el único Stripe Refund del flujo, calculado sobre los
    artículos realmente devueltos, y restaura stock
  Cada transición queda auditada en return_status_history
```

## Bugs encontrados y resueltos durante la verificación

Tres bugs bloqueaban el cierre de la feature, encontrados al probar el flujo
completo con datos reales:

1. **Tabla `return_status_history` no existía según Eloquent** (SQLSTATE 42S02).
   La migración crea la tabla en singular pero el modelo no fijaba `$table`,
   así que Eloquent buscaba `return_status_histories`. Ver detalle abajo.

2. **`stripe_payment_intent_id` nulo en pedidos anteriores a la feature**,
   lo que rompía "Confirmar recepción y reembolsar" con
   *"No se puede procesar el reembolso. El pedido no tiene ID de pago."*
   Se creó el comando `stripe:sync-payment-intents` (ver sección dedicada).
   Primera versión del comando: filtraba `status = 'paid'`, lo que excluía
   pedidos que ya habían avanzado a `shipped` / `return_approved` /
   `refunded` por el propio flujo de devoluciones — exactamente los pedidos
   que necesitaban el reembolso. Se quitó ese filtro: ahora procesa
   cualquier pedido con `payment_intent_id` nulo, sin importar su `status`.

3. **El modal admin de detalle de devolución no mostraba qué artículos se
   devolvían ni los datos del cliente/dirección de envío.**
   `AdminReturnController@show` no cargaba `items.orderItem.product`,
   `items.orderItem.variant` ni `order.items.variant`, así que esos datos
   nunca llegaban al frontend aunque ya existieran en BD. Se añadió el
   eager loading correspondiente y dos secciones nuevas en
   `AdminReturnsPage.tsx`: "Artículos a devolver" (con subtotal y total) y
   "Datos del cliente" (nombre, email, dirección de envío, link al pedido).

## Comando `stripe:sync-payment-intents`

```
docker compose exec backend php artisan stripe:sync-payment-intents
```

Recupera el `payment_intent_id` desde la Checkout Session de Stripe
(`Session::retrieve($order->stripe_session_id)`) para cualquier pedido que
tenga `stripe_payment_intent_id` nulo. No filtra por `status` — un pedido con
devolución o cancelación en curso ya no está en `paid` aunque siga
necesitando su `payment_intent_id` para poder reembolsarse.

**Cuándo ejecutarlo:**
- Una vez, tras desplegar esta feature, para poblar los pedidos históricos.
- Cada vez que "Confirmar recepción y reembolsar" falle con el mensaje de
  "no tiene ID de pago" y el pedido sí tenga `stripe_session_id` (indica que
  el sync no se ejecutó o falló para ese pedido en concreto).

**Salida del comando:**
- Pedidos con `stripe_session_id` → se intenta recuperar el `payment_intent`
  de Stripe. Si la sesión no tiene `payment_intent` (pago nunca completado),
  se loguea como advertencia, no como error.
- Pedidos **sin** `stripe_session_id` → no hay forma de consultarlos en
  Stripe; se listan aparte como irrecuperables automáticamente, para
  gestión manual en el dashboard de Stripe.
- Cada fallo de la API de Stripe se loguea con `http_status`, tipo y código
  de error de Stripe (`Log::error`, canal por defecto) para poder
  diagnosticar fallos silenciosos sin depender solo de la salida de consola.

## Fix: tabla `return_status_history` no encontrada

Sqlstate 42S02 al usar `ReturnStatusHistory`: Eloquent infiere el nombre de tabla
pluralizando el nombre de la clase en snake_case. `ReturnStatusHistory` →
`return_status_history` → pluralizado a `return_status_histories` (Eloquent
pluraliza la última palabra, "history" → "histories"). La migración, en cambio,
crea la tabla en singular (`return_status_history`), coherente con el resto del
esquema donde las tablas de auditoría no llevan el sufijo plural sistemáticamente.

La migración ya se había ejecutado correctamente (confirmado con
`SHOW TABLES`); el problema era exclusivamente la falta de `protected $table`
en el modelo. Se añadió `protected $table = 'return_status_history';` en lugar
de crear una migración de rename — la tabla ya tenía datos reales en algunos
entornos y no había ninguna razón de esquema para pluralizarla.

## Devoluciones parciales

### Por qué una tabla nueva y no una columna en `return_requests`
Una solicitud de devolución puede cubrir varios artículos del pedido con
cantidades independientes. Modelarlo como filas en `return_request_items`
(`return_request_id`, `order_item_id`, `quantity`, `reason` nullable) permite
sumar el reembolso exacto por artículo sin serializar arrays en una columna.

### Fallback a devolución completa
Si `items[]` no se envía en el request, el comportamiento es idéntico al
anterior a esta iteración: se crea la `return_request` sin filas en
`return_request_items` y el reembolso se calcula sobre `order->total`. Esto
evita romper cualquier integración o test que ya dependiera del contrato
anterior, y es la rama que toma `AdminReturnController@receive` cuando
`$rr->items` está vacío.

### Validación de pertenencia y cantidad en el backend
`ReturnRequestController@store` nunca confía en los `order_item_id` que llegan
del cliente: se comprueban contra `$order->items` (ya cargado por
`Order::with('items')`) antes de tocar la base de datos, y se rechaza
cualquier `quantity` que supere la cantidad comprada de ese artículo. Sin esto,
un usuario podría solicitar devolver más unidades de las que compró o
artículos de otro pedido.

### Cálculo del `refund_amount` en `receive()`
Antes: `$order->total`. Ahora: suma de `unit_price * quantity` de cada
`ReturnRequestItem`, usando `unit_price` congelado en `order_items` (el precio
pagado en su momento, no el precio actual del producto). El `shipping_cost`
de un `desistimiento` solo se añade cuando la cantidad total devuelta iguala
la cantidad total del pedido (`$isFullReturn`) — devolver un solo artículo de
un pedido con tres no da derecho a recuperar el envío completo.

### Frontend: selección con checkbox y cantidad, no un total de golpe
`ReturnRequestModal.tsx` inicializa la selección con todos los artículos
marcados y su cantidad completa (mantiene el comportamiento por defecto
igual al anterior: devolver todo). El usuario desmarca lo que no quiere
devolver o reduce la cantidad con un `<select>` acotado a `1..quantity`
comprada. El subtotal se recalcula en cada cambio de estado local — no hay
llamada al backend hasta el submit, así que el usuario ve el importe exacto
antes de confirmar. Se bloquea el envío si no queda ningún artículo marcado.

## Limitaciones conocidas

- El campo `reason` de `return_request_items` está pensado para motivos
  distintos por artículo (post-MVP); el formulario actual sigue usando un
  único motivo para toda la solicitud, así que se guarda `null` por fila.
- No hay endpoint para editar artículos de una solicitud ya creada — hay que
  cancelarla y crear una nueva (no hay endpoint de cancelación de
  `return_request` en este MVP tampoco).

## Cómo probar el flujo completo manualmente

Pasos verificados durante el cierre de esta feature (todos ejecutados contra
el contenedor `backend` vía `docker compose exec`):

1. **Confirmar que las tablas existen con el nombre esperado:**
   ```
   docker compose exec backend php artisan tinker --execute="print_r(array_map('current', array_map('get_object_vars', \DB::select('SHOW TABLES'))));"
   ```
   Debe listar `return_requests`, `return_status_history` (singular) y
   `return_request_items`.

2. **Sincronizar `payment_intent_id` para pedidos existentes:**
   ```
   docker compose exec backend php artisan stripe:sync-payment-intents
   ```
   Revisar la salida: cuántos se actualizaron, cuántos quedaron sin
   `payment_intent` (pago no completado) y cuántos no tienen `session_id`
   (irrecuperables, gestión manual).

3. **Crear una devolución parcial de prueba** desde `/perfil` en un pedido
   `shipped`/`delivered`: desmarcar al menos un artículo del modal, comprobar
   que el subtotal mostrado baja en tiempo real, y que el envío queda
   bloqueado si se desmarcan todos los artículos.

4. **Verificar en BD que se creó `return_request_items`** solo para los
   artículos marcados:
   ```
   docker compose exec backend php artisan tinker --execute="print_r(\App\Models\ReturnRequest::latest()->first()->items()->get()->toArray());"
   ```

5. **Aprobar la devolución** desde `/admin/devoluciones` y abrir el modal de
   detalle: comprobar que aparecen las secciones "Artículos a devolver" (con
   el subtotal y total correctos) y "Datos del cliente" (nombre, email,
   dirección de envío, link a `/admin/pedidos?order=ID` que debe abrir
   directamente el detalle de ese pedido).

6. **Confirmar recepción y reembolso**: comprobar que el `refund_amount`
   ejecutado en Stripe corresponde solo a los artículos devueltos (no al
   total del pedido), y que el stock se restaura solo para esas cantidades.

7. **Caso `desistimiento` parcial**: repetir devolviendo solo parte de los
   artículos y confirmar que el `shipping_cost` **no** se añade al
   reembolso; repetir devolviendo todos los artículos y confirmar que sí
   se añade.

8. **`php artisan test`** — confirmar que el número de fallos no aumenta
   respecto a la línea base (19 fallos preexistentes en `FanficTest` /
   `CheckoutTest`, no relacionados con esta feature).
