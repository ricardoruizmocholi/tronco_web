# 026 — Facturación

## Spec

### Qué hace
Al confirmarse el pago de un pedido (webhook de Stripe), la app genera
automáticamente una factura con numeración correlativa sin huecos, calcula
el desglose de IVA, y produce un PDF descargable tanto para el cliente como
desde el panel de admin. El cliente puede pedir factura completa (con NIF/CIF
y razón social) marcando una casilla en el checkout; si no la marca, recibe
una factura simplificada a su nombre.

### Criterios de aceptación
- [x] Al marcar un pedido como `paid` en `StripeWebhookController`, se crea
      automáticamente una `Invoice` asociada
- [x] La numeración (`series-year-number`, ej. `A-2026-000123`) es correlativa
      y sin huecos, garantizada con `lockForUpdate()` sobre una tabla de
      contadores dentro de la misma transacción que crea la factura
- [x] Los datos fiscales del emisor (razón social, NIF/CIF, dirección, tipo
      de IVA) se editan desde `/admin/ajustes`
- [x] El checkout tiene una casilla opcional "Quiero factura con mis datos
      fiscales"; si se marca, pide razón social/nombre, NIF/CIF y dirección
      de facturación; si no, la factura se emite simplificada a nombre de la
      cuenta con la dirección de envío
- [x] La factura desglosa IVA a partir del total ya cobrado (los precios del
      catálogo incluyen IVA — no se añade encima)
- [x] Se genera un PDF descargable, tanto desde `/admin/facturas` como desde
      `/mis-pedidos` (solo el propietario del pedido puede descargar la suya)
- [x] `/admin/facturas`: listado con filtro por fecha y cliente/número,
      detalle con desglose, descarga
- [x] Si falla la generación de la factura o el PDF, el pedido se marca como
      pagado igualmente — la facturación nunca bloquea la confirmación del
      pago (se registra el error en logs para recuperación manual)
- [x] El webhook sigue siendo idempotente: un reenvío de Stripe no duplica
      la factura del mismo pedido

### Fuera de alcance
- Facturas rectificativas / abonos cuando hay una devolución — la Feature
  027 (libro de ingresos y gastos) registra la salida de caja, pero la
  factura original no se anula ni se emite una rectificativa. Candidato a
  una Feature C si hace falta más adelante
- Envío de la factura por email
- Más de una serie de facturación simultánea (el modelo lo soporta —
  `invoice_counters` es por `series` — pero solo se usa la serie `A`)
- Regeneración de PDF con datos corregidos a mano tras la emisión (los
  datos de una factura ya emitida son inmutables por diseño legal)

---

## Plan

### Decisión técnica 1 — numeración correlativa sin huecos
`invoice_counters` (una fila por `series`+`year`, `unique(series, year)`).
Al crear una factura: `InvoiceCounter::lockForUpdate()->firstOrCreate(...)`
dentro de `DB::transaction()`, incrementa `last_number`, y crea la `Invoice`
en la misma transacción. El bloqueo de fila (InnoDB) hace que una segunda
transacción concurrente espere hasta que la primera confirme — nunca lee un
`last_number` desfasado. Si algo falla después de incrementar, toda la
transacción revierte (incluido el contador), así que el número se reutiliza
en el siguiente intento en vez de perderse. La primerísima factura de una
serie/año nueva tiene una carrera teórica en el `firstOrCreate` inicial,
cubierta por el `unique(series, year)` de BD + un reintento automático en
`InvoiceService::withNumberLock()` si salta ese choque.

### Decisión técnica 2 — datos fiscales del receptor: opcionales
Checkbox en el checkout, no obligatorio. Marcado → factura completa (NIF/CIF
+ razón social + dirección de facturación). Sin marcar → factura simplificada
(`is_simplified = true`) a nombre de la cuenta con la dirección de envío —
válido en España para consumo (RD 1619/2012), evita pedir NIF a quien compra
una camiseta. Los datos se capturan en `orders.billing_info` (json, en el
momento del checkout) y se copian como snapshot fijo a `invoices.buyer_*` al
facturar — una factura nunca cambia si el cliente edita su perfil después.

### Decisión técnica 3 — precios con IVA incluido
El catálogo no gestiona IVA en ningún sitio (práctica estándar B2C en
España: los precios mostrados ya lo incluyen). La factura desglosa el total
ya cobrado (`order.total + order.shipping_cost`) en base imponible + cuota,
no añade IVA encima: `subtotal = round(total / (1 + tax_rate/100))`,
`tax_amount = total - subtotal`. El tipo (`tax_rate`) es editable desde
`/admin/ajustes` y se guarda en cada factura por si cambia con el tiempo.

### Decisión técnica 4 — PDF síncrono, no en cola
El proyecto tiene tabla `jobs` y `QUEUE_CONNECTION=database`, pero ningún
worker corriendo en `docker-compose.yml`. Un `Job` encolado no se ejecutaría
nunca en este entorno. El PDF (`barryvdh/laravel-dompdf`) se genera de forma
síncrona justo después de confirmar la transacción que crea la factura,
fuera de ella (I/O de archivo no debe mantener bloqueada la fila del
contador). Si se añade un worker más adelante, mover esto a una cola es un
cambio localizado en `StripeWebhookController`.

### Decisión técnica 5 — la facturación nunca bloquea el pago
Dentro del webhook, la creación de la `Invoice` y el PDF están envueltas en
`try/catch` separados del bloque que marca el pedido como `paid` y descuenta
stock. Si facturar falla, el pedido queda pagado igual (lo crítico) y el
error se registra en logs para recuperación manual — no se arriesga a que un
bug de facturación deje un pedido pagado por Stripe pero sin confirmar en la
tienda.

### Backend (Laravel)
- Migraciones: `invoice_counters`, `invoices`, `orders.billing_info` (json,
  nullable)
- Modelos: `Invoice`, `InvoiceCounter`; `Order` gana `invoice()` (hasOne) y
  `billing_info` en fillable/casts
- `InvoiceService::createForOrder()` — numeración + desglose de IVA +
  snapshot del receptor (simplificada o completa)
- `InvoicePdfService::generate()` / `ensurePdf()` — plantilla Blade +
  dompdf, guardado en `storage/app/invoices/{year}/{full_number}.pdf`
- `StripeWebhookController` — llama a ambos servicios dentro del bloque ya
  idempotente que marca el pedido como pagado
- `AdminBillingSettingsController` — `GET`/`PUT /api/admin/billing-settings`
  sobre `Setting::get/set('company_billing_info')` (reutiliza el modelo
  genérico ya creado para el modo mantenimiento)
- `AdminInvoiceController` — listado con filtros (`date_from`, `date_to`,
  `search`), detalle, descarga
- `OrderController@invoice` — descarga de la propia factura, con
  comprobación de propiedad del pedido
- `CheckoutController@store` — valida y guarda `billing_info` opcional

### Frontend (React)
- `ShippingAddressModal.tsx` — checkbox "Quiero factura con mis datos
  fiscales" + campos condicionales (razón social, NIF/CIF, dirección de
  facturación, con botón "usar la misma dirección de envío")
- `AdminSettingsPage.tsx` — tarjeta "Datos de facturación" (razón social,
  NIF/CIF, dirección, tipo de IVA)
- `AdminInvoicesPage.tsx` (`/admin/facturas`) — listado, filtros, modal de
  detalle con desglose, descarga; entrada nueva en `adminNav.tsx`
- `OrdersPage.tsx` (`/mis-pedidos`) — botón "Descargar factura" cuando el
  pedido tiene una asociada

---

## Tasks

1. [x] Migraciones `invoice_counters`, `invoices`, `orders.billing_info` +
   modelos `Invoice`, `InvoiceCounter` + relación `Order::invoice()`
2. [x] `AdminBillingSettingsController` + tarjeta "Datos de facturación" en
   `/admin/ajustes`
3. [x] Checkbox + campos fiscales en `ShippingAddressModal.tsx` +
   `CheckoutController@store` guarda `billing_info`
4. [x] `InvoiceService` (numeración correlativa + desglose de IVA) +
   integración en `StripeWebhookController`, con manejo de fallos que no
   bloquea la confirmación del pago
5. [x] `InvoicePdfService` + plantilla `resources/views/invoices/pdf.blade.php`
   + `barryvdh/laravel-dompdf`
6. [x] Endpoints: `GET/PUT /api/admin/billing-settings`,
   `GET /api/admin/invoices`, `GET /api/admin/invoices/{id}`,
   `GET /api/admin/invoices/{id}/download`, `GET /api/orders/{id}/invoice`
7. [x] `AdminInvoicesPage.tsx` + entrada en `adminNav.tsx`/sidebar
8. [x] Botón "Descargar factura" en `/mis-pedidos`
9. [x] Tests de feature (`InvoiceTest.php`: numeración sin huecos, desglose
   de IVA, idempotencia del webhook, permisos de descarga, filtros admin;
   más 2 tests nuevos en `CheckoutTest.php` para `billing_info`) + QA manual
   con Playwright (listado, filtro, detalle, descarga PDF real, ajustes,
   `/mis-pedidos`) + commit + push
