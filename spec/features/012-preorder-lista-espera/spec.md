# 012 — Preorder y lista de espera

## Spec

### Qué hace
Permite a los usuarios reservar productos agotados mediante un sistema de
preorder. El admin activa el preorder por producto desde el panel. Los
usuarios con reserva son notificados cuando hay stock disponible.

### Criterios de aceptación
- [x] El admin puede activar `allow_preorder` en cualquier producto desde el panel
- [x] Cuando `stock = 0` y `allow_preorder = true`, la ficha de producto muestra un botón "Reservar"
- [x] Un usuario autenticado puede reservar; un usuario no autenticado es redirigido al login
- [x] El sistema registra la reserva con user_id, product_id, variant_id (si aplica) y email
- [x] Un usuario no puede hacer dos reservas del mismo producto/variante
- [x] El admin ve la lista de reservas en `/admin/preorders` con nombre, email, producto, fecha
- [x] El admin puede exportar la lista de reservas a CSV
- [x] Si el usuario no está autenticado puede reservar dejando solo su email (preorder anónimo)

### Fuera de alcance
- Pago anticipado en la reserva (la reserva es solo de interés, sin cargo)
- Notificación automática por email cuando hay stock (requiere integración de email)
- Límite de unidades por reserva

---

## Plan

### Backend
- Migración `preorders`: id, user_id (FK nullable), product_id (FK), variant_id (FK nullable), email (varchar), created_at
- Campo `allow_preorder` (boolean default false) en `products`
- Migración `add_allow_preorder_to_products`
- Modelo `Preorder` con relaciones a `User`, `Product`, `ProductVariant`
- Endpoint `POST /api/preorders`: acepta product_id, variant_id opcional, email; unique constraint por (email, product_id, variant_id)
- Endpoint admin `GET /api/admin/preorders`: lista con filtros (producto, fecha)
- Endpoint admin `GET /api/admin/preorders/export`: CSV
- Toggle `allow_preorder` en `AdminProductController` (o endpoint PATCH existente)

### Frontend
- `ProductPage.tsx`: mostrar botón "Reservar" cuando `stock === 0 && product.allow_preorder`
- `PreorderModal.tsx`: modal con confirmación (y campo email si no está autenticado)
- `api/preorders.ts`: función `createPreorder`
- `AdminPreordersPage.tsx`: tabla de reservas + exportación CSV
- Card en `AdminDashboardPage`
- Toggle `allow_preorder` en el formulario de edición de producto en `AdminProductsPage`

### Dependencia
Requiere `002-catalogo-productos`. Opcionalmente `008-tallas-productos` para `variant_id`.

---

## Tasks

1. [x] Migración `add_allow_preorder_to_products`
2. [x] Migración `preorders`
3. [x] Modelo `Preorder` con relaciones y unique constraint
4. [x] Endpoint `POST /api/preorders` con validación de duplicados
5. [x] Endpoints admin: listado y exportación CSV
6. [x] Rutas en `api.php`
7. [x] Toggle `allow_preorder` en panel admin de productos
8. [x] `ProductPage.tsx`: botón "Reservar" condicional
9. [x] `PreorderModal.tsx`: confirmación con email para anónimos
10. [x] `api/preorders.ts`: función `createPreorder`
11. [x] `AdminPreordersPage.tsx`: tabla + exportación
12. [x] Card en `AdminDashboardPage`
13. [x] Verificar los 8 criterios de aceptación
