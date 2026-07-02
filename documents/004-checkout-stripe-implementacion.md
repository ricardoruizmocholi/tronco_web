# 004 — Checkout con Stripe: Decisiones de Implementación

## Arquitectura general

El flujo de pago sigue el patrón estándar de Stripe Checkout Session (hosted):

```
Frontend (carrito)
  → POST /api/checkout [{product_id, quantity}]
  → Backend valida stock y recalcula total
  → Crea Order (status=pending) + OrderItems
  → Crea Stripe Checkout Session
  → Devuelve checkout_url
Frontend → window.location.href = checkout_url
  → Usuario paga en Stripe
  → Stripe redirige a /checkout/exito?order=ID
  → Stripe envía webhook checkout.session.completed
Backend → marca Order como paid, descuenta stock
```

## Decisiones de esquema

### `stripe_session_id` en lugar de `stripe_payment_intent_id`
El MCD llamaba al campo `stripe_payment_intent_id`, pero para Stripe Checkout Session el identificador relevante en el webhook es el **session ID** (`cs_xxx`), disponible desde el momento de creación. El `payment_intent_id` (`pi_xxx`) solo llega después del pago. Renombrado a `stripe_session_id` para reflejar el objeto real. Se guarda en el pedido justo después de crear la sesión, y también en el webhook como segunda escritura (por si acaso).

### Total y unit_price en céntimos (`unsignedInteger`)
Consistente con `products.price`. Stripe también trabaja en céntimos, por lo que no hay conversión en ninguna dirección. El campo `unit_price` en `order_items` congela el precio en el momento de la compra — si el precio del producto cambia después, el historial de pedidos refleja el precio pagado.

### `restrictOnDelete` en `orders.user_id`
Los pedidos son registros contables. Si se eliminara un usuario, sus pedidos deben preservarse o fallar explícitamente, no borrarse en cascada.

### `restrictOnDelete` en `order_items.product_id`
Un producto con pedidos asociados no puede eliminarse. En el MVP los productos se desactivan (`is_active=false`), no se borran, por lo que esta restricción no tiene impacto práctico pero protege la integridad histórica.

## Seguridad

### El backend siempre recalcula el total
`CheckoutController::store()` no lee ningún campo de precio del request. Reconstruye el total a partir de `Product::whereIn('id', $ids)->where('is_active', true)->get()` y suma `$product->price * $line['quantity']`. Los `line_items` enviados a Stripe también usan `$product->price`, no ningún valor del frontend.

### Validación de stock antes de cualquier operación de BD
El bloque de comprobación de stock ocurre antes del `DB::transaction`. Si hay insuficiencia en cualquier item, se devuelve 422 inmediatamente sin crear el `Order`. Esto evita limpiar registros huérfanos en caso de error.

### Verificación de firma del webhook
`Stripe\Webhook::constructEvent($payload, $sigHeader, $secret)` verifica la firma HMAC-SHA256 con `STRIPE_WEBHOOK_SECRET`. Cualquier petición sin firma válida recibe 400. El payload se lee con `$request->getContent()` (raw body) — si se leyera con `$request->json()`, Laravel habría re-codificado el JSON y la firma fallaría.

### Idempotencia del webhook con `lockForUpdate`
El `DB::transaction` con `lockForUpdate()` en el `Order` garantiza que si Stripe reenvía el evento simultáneamente, solo un proceso avanza. El segundo proceso espera el lock, lo adquiere, encuentra `status === 'paid'` y sale sin descontar stock. El check `if ($order->status === 'paid') return` es la puerta de idempotencia.

### `decrement()` atómico para el stock
`$product->decrement('stock', $qty)` genera `UPDATE products SET stock = stock - N WHERE id = ?`. Es atómico en MySQL — no hay ventana de race condition entre leer y escribir el stock.

## Mock de Stripe en tests sin `@runInSeparateProcess`

Problema: `Stripe\Checkout\Session::create()` es un método estático que internamente usa el cliente HTTP del SDK. En tests no se puede usar Mockery `alias:` sin procesos separados (que rompen `RefreshDatabase`).

Solución: `Stripe\ApiRequestor::setHttpClient($mockClient)` sustituye el cliente HTTP subyacente del SDK. El mock implementa `Stripe\HttpClient\ClientInterface::request()` y devuelve una respuesta JSON válida con `id` y `url`. El SDK deserializa esa respuesta en un `StripeObject` accesible como `$session->id` y `$session->url`. Sin llamadas de red, sin `@runInSeparateProcess`, compatible con `RefreshDatabase`.

Los tests de webhook usan `$this->call()` con el body raw para que `$request->getContent()` devuelva exactamente el mismo string sobre el que se computó la firma HMAC-SHA256.

## Estructura del frontend

### Botón "Ir a pagar" en CartDrawer
Reemplaza el botón deshabilitado. En `handlePay()`:
1. `initiateCheckout(items.map(i => ({ product_id: i.productId, quantity: i.quantity })))`
2. Si éxito: `window.location.href = checkout_url` (navegación externa, no React Router)
3. Si error (422 por stock, 401 por sesión expirada): muestra `payError` sobre el botón

No se vacía el carrito aquí. El carrito se vacía en `CheckoutSuccessPage` al montar, después de que Stripe redirige al usuario de vuelta.

### CheckoutSuccessPage — caso edge de webhook tardío
Stripe redirige al usuario a `/checkout/exito?order=ID` inmediatamente tras el pago. El webhook `checkout.session.completed` puede llegar segundos después. Cuando el usuario aterriza, el `Order` puede tener `status=pending`.

Decisión: mostrar el resumen igualmente con el mensaje "Pago en proceso de confirmación" en lugar de bloquear la UI esperando el webhook. No se hace polling. La fuente de verdad es `/mis-pedidos`, donde el usuario puede ver el estado actualizado cuando refresque.

### Cancelación — pedidos que quedan en `pending`
Cuando el usuario cancela en Stripe, llega a `/checkout/cancelado`. El `Order` queda en `pending` indefinidamente porque Stripe Checkout no emite un webhook de cancelación de sesión. El stock no queda bloqueado (solo se descuenta en el webhook de pago exitoso). El registro `pending` huérfano es inofensivo para el MVP — se puede limpiar con un job programado en el futuro.

## Limitaciones conocidas y mejoras futuras

- El webhook no se puede verificar con Stripe CLI en localhost sin exponer el puerto (ngrok o similar). En producción, Stripe envía directamente al dominio público.
- Los pedidos `pending` de cancelaciones no se marcan como `cancelled` automáticamente. Mejora: job que expire pedidos `pending` con más de N horas sin pago.
- `shipping_address` está en el esquema pero no se recoge en el flujo actual — Stripe puede recogerla en la sesión de checkout con `shipping_address_collection`. Se deja para una iteración posterior.
- No hay endpoint de detalle de pedido individual en `/mis-pedidos` — la página lista todos los pedidos con items inline. Se puede añadir una ruta `/mis-pedidos/{id}` si el historial crece.
