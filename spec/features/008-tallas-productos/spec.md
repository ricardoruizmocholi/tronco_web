# 008 — Tallas de productos

## Spec

### Qué hace
Añade soporte de variantes de talla a los productos: cada producto puede
tener múltiples tallas con stock independiente. El comprador elige talla
antes de añadir al carrito, y el checkout valida stock por variante.

### Criterios de aceptación
- [ ] Un producto puede tener cero o más variantes (tallas) con stock propio
- [ ] La ficha de producto muestra un selector de talla cuando el producto tiene variantes
- [ ] No se puede añadir al carrito sin seleccionar talla si el producto tiene variantes
- [ ] El stock mostrado corresponde a la variante seleccionada
- [ ] El carrito almacena `variant_id` junto a `product_id`
- [ ] El checkout valida stock por variante, no por producto padre
- [ ] El panel admin permite crear, editar y desactivar variantes por producto
- [ ] Una variante inactiva no aparece en la ficha de producto
- [ ] Si ninguna variante tiene stock, el botón de compra muestra "Agotado"

### Fuera de alcance
- Variantes de color (solo tallas en esta feature)
- Combinaciones talla × color (post-MVP)

---

## Plan

### Backend
- Migración `product_variants`: id, product_id (FK), size (varchar), stock (unsigned int), is_active (boolean default true), timestamps
- Modelo `ProductVariant` con `belongsTo Product`; modelo `Product` con `hasMany ProductVariant`
- `ProductController@show` incluye `variants` en la respuesta
- `ProductController@index` incluye `variants` (para mostrar disponibilidad en cards)
- Endpoints admin: `POST /api/admin/products/{product}/variants`, `PUT /api/admin/products/{product}/variants/{variant}`, `DELETE /api/admin/products/{product}/variants/{variant}`
- `CheckoutController`: validar `variant_id` cuando el producto tiene variantes; descontar stock de `product_variants` en el webhook

### Frontend
- `types/product.ts`: añadir `ProductVariant` y campo `variants` en `Product`
- Selector de talla en `ProductPage.tsx` con estados disponible/agotado por variante
- `cartStore`: añadir `variantId` y `size` al item del carrito
- `CartDrawer.tsx`: mostrar talla junto al nombre del producto
- Panel admin: sección de variantes en el formulario de producto (tabla inline + añadir/editar)

### Dependencia
Requiere `002-catalogo-productos` y `004-checkout-stripe`.

---

## Tasks

1. [ ] Migración `product_variants`
2. [ ] Modelo `ProductVariant` y relación en `Product`
3. [ ] Endpoints admin CRUD variantes (`/api/admin/products/{product}/variants`)
4. [ ] `ProductController@show` y `@index` incluyen variantes activas
5. [ ] `CheckoutController`: validar y descontar por variante
6. [ ] `types/product.ts`: tipo `ProductVariant` + campo en `Product`
7. [ ] Selector de talla en `ProductPage.tsx`
8. [ ] `cartStore`: soporte `variantId` y `size`
9. [ ] `CartDrawer.tsx`: mostrar talla en cada item
10. [ ] Panel admin: gestión de variantes por producto
11. [ ] Verificar los 9 criterios de aceptación
