# 012 — Preorder y lista de espera

## Spec

### Qué hace
Permite a los usuarios reservar productos agotados mediante un sistema de
preorder. El admin activa el preorder por producto desde el panel. Los
usuarios con reserva son notificados cuando hay stock disponible.

### Criterios de aceptación
- [ ] El admin puede activar `allow_preorder` en cualquier producto desde el panel
- [ ] Cuando `stock = 0` y `allow_preorder = true`, la ficha de producto muestra un botón "Reservar"
- [ ] Un usuario autenticado puede reservar; un usuario no autenticado es redirigido al login
- [ ] El sistema registra la reserva con user_id, product_id, variant_id (si aplica) y email
- [ ] Un usuario no puede hacer dos reservas del mismo producto/variante
- [ ] El admin ve la lista de reservas en `/admin/preorders` con nombre, email, producto, fecha
- [ ] El admin puede exportar la lista de reservas a CSV
- [ ] Si el usuario no está autenticado puede reservar dejando solo su email (preorder anónimo)

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

1. [ ] Migración `add_allow_preorder_to_products`
2. [ ] Migración `preorders`
3. [ ] Modelo `Preorder` con relaciones y unique constraint
4. [ ] Endpoint `POST /api/preorders` con validación de duplicados
5. [ ] Endpoints admin: listado y exportación CSV
6. [ ] Rutas en `api.php`
7. [ ] Toggle `allow_preorder` en panel admin de productos
8. [ ] `ProductPage.tsx`: botón "Reservar" condicional
9. [ ] `PreorderModal.tsx`: confirmación con email para anónimos
10. [ ] `api/preorders.ts`: función `createPreorder`
11. [ ] `AdminPreordersPage.tsx`: tabla + exportación
12. [ ] Card en `AdminDashboardPage`
13. [ ] Verificar los 8 criterios de aceptación
