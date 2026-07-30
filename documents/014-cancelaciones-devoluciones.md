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
