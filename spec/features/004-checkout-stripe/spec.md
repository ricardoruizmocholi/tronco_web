# 004 — Checkout con Stripe

## Spec

### Qué hace
Convierte el carrito en un pedido real con pago procesado por Stripe,
de forma segura (el backend manda sobre precios y stock).

### Criterios de aceptación
- [ ] Solo un usuario autenticado puede iniciar checkout
- [ ] El backend recalcula el total a partir de los `product_id` y cantidades enviados, ignorando cualquier precio del frontend
- [ ] Si algún producto no tiene stock suficiente, el checkout se rechaza con mensaje claro antes de cobrar
- [ ] Se crea un `order` con estado `pending` antes de redirigir a Stripe
- [ ] Se usa Stripe Checkout Session (hosted) para el pago
- [ ] Un webhook de Stripe (`checkout.session.completed`) marca el pedido como `paid` y descuenta stock
- [ ] El webhook verifica la firma de Stripe (`STRIPE_WEBHOOK_SECRET`)
- [ ] Si el pago falla o se cancela, el pedido queda en estado `failed` o `cancelled`, sin descontar stock
- [ ] El usuario ve una página de confirmación con el resumen del pedido tras pago exitoso
- [ ] El usuario puede ver su historial de pedidos en `/mis-pedidos`

### Fuera de alcance
- Pagos parciales, reembolsos automáticos, suscripciones
- Métodos de pago fuera de los que ofrece Stripe Checkout por defecto

---

## Plan

### Backend
- Migraciones `orders` (id, user_id, status, total, stripe_payment_intent_id, shipping_address json, timestamps) y `order_items` (id, order_id, product_id, quantity, unit_price, timestamps)
- `CheckoutController@store`: recibe `[{product_id, quantity}]`, valida stock,
  recalcula total, crea `order` en estado `pending` con sus `order_items`,
  crea Stripe Checkout Session con `success_url`/`cancel_url`, devuelve la URL de Stripe
- `StripeWebhookController`: recibe el webhook, verifica firma, en
  `checkout.session.completed` marca `order.status = paid`, descuenta
  stock de cada producto en una transacción de BD
- Endpoint `GET /api/orders` (mis pedidos del usuario autenticado)
- Webhook idempotente: si Stripe reenvía el evento, no descontar stock dos veces

### Frontend
- Botón "Pagar" en `/carrito` que llama a `POST /api/checkout` y redirige a la URL de Stripe devuelta
- Página `/checkout/exito` con resumen del pedido (consulta `GET /api/orders/{id}`)
- Página `/checkout/cancelado`
- Página `/mis-pedidos` con listado de pedidos del usuario y su estado

### Dependencia
Requiere `001-autenticacion` y `003-carrito` completas.

---

## Tasks

1. [ ] Migraciones `orders` y `order_items`
2. [ ] Modelos `Order`, `OrderItem` con relaciones
3. [ ] Instalar Stripe PHP SDK, configurar claves en `.env`
4. [ ] `CheckoutController@store` con validación de stock y recalculo de total
5. [ ] Crear Stripe Checkout Session y devolver URL
6. [ ] `StripeWebhookController` con verificación de firma e idempotencia
7. [ ] Lógica de descuento de stock en transacción
8. [ ] Endpoint `GET /api/orders` y `GET /api/orders/{id}`
9. [ ] Tests Feature: checkout con stock suficiente, checkout rechazado por falta de stock, webhook marca pedido como pagado
10. [ ] Frontend: botón pagar + redirección a Stripe
11. [ ] Frontend: páginas éxito/cancelado/mis-pedidos
12. [ ] Probar flujo completo en modo test de Stripe (tarjeta de prueba)
13. [ ] Verificar los 10 criterios de aceptación