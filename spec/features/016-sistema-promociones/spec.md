# 016 — Sistema de promociones

## Spec

### Qué hace
Permite crear promociones sobre productos con precio rebajado, fechas
automáticas opcionales y toggle manual. Los productos en promoción y los
nuevos aparecen en la landing page en una sección de ofertas tipo carrusel.

### Criterios de aceptación

**Backend**
- [x] Tabla `promotions`: id, product_id (FK), discount_type (percent|fixed),
  discount_value (int — porcentaje 0-100 o céntimos), starts_at (timestamp nullable),
  ends_at (timestamp nullable), is_active (boolean default true), created_at, updated_at
- [x] Precio promocional calculado en backend: si discount_type=percent →
  `price * (1 - discount_value/100)`; si fixed → `price - discount_value`
- [x] Una promoción está vigente si: is_active=true AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
- [x] GET /api/products devuelve `promotion` con precio_original y precio_promocional si vigente
- [x] GET /api/promotions/active — lista productos en promoción activa (para carrusel landing)
- [x] GET /api/products/new — lista productos creados en los últimos 30 días (para carrusel landing)
- [x] Panel admin: CRUD completo de promociones
- [x] Panel admin: vista de promociones activas, programadas y expiradas

**Frontend — ficha y cards de producto**
- [x] `ProductCard.tsx`: badge "OFERTA" + precio tachado + precio rebajado si hay promoción vigente
- [x] `ProductPage.tsx`: precio original tachado + precio promocional destacado
- [x] El precio que se añade al carrito es siempre el precio promocional si la promoción está vigente
- [x] El precio se congela en el momento de añadir al carrito (comportamiento actual)

**Landing page — sección carrusel**
- [x] Nueva sección en `HomePage.tsx` debajo del hero: "Ofertas y novedades"
- [x] Carrusel con dos pestañas o scroll horizontal: "En oferta" y "Nuevos"
- [x] Carrusel tipo scroll horizontal con flechas de navegación (sin librería externa)
- [x] Cards del carrusel: misma `ProductCard` ya existente
- [x] Si no hay productos en oferta, la pestaña "En oferta" no se muestra
- [x] Si no hay productos nuevos (últimos 30 días), la pestaña "Nuevos" no se muestra
- [x] Si ambas están vacías, la sección entera no se muestra

**Panel admin**
- [x] Página `/admin/promociones` con tabla de todas las promociones
- [x] Columnas: Producto, Tipo descuento, Valor, Precio original, Precio final, Vigencia, Estado
- [x] Crear promoción: seleccionar producto, tipo (%), valor, fechas opcionales, toggle activo
- [x] Editar y eliminar promoción
- [x] Badge de estado: Activa (verde), Programada (azul), Expirada (gris), Inactiva (amarillo)
- [x] Card "Promociones" en `AdminDashboardPage`
- [x] Ruta `/admin/promociones` protegida con `<AdminRoute>`

### Fuera de alcance
- Códigos de descuento / cupones (post-MVP)
- Promociones sobre categorías enteras (post-MVP)
- Promociones sobre variantes específicas (post-MVP — requiere feature 015)
- Notificaciones por email de promociones (post-MVP)

---

## Plan

### Backend

**Migración**
- `create_promotions_table`: todos los campos del criterio de aceptación

**Modelo**
- `Promotion`: belongsTo Product, scope `active()` con la lógica de vigencia,
  accessor `discounted_price` calculado

**Controladores**
- `PromotionController` (público): `GET /api/promotions/active`
- `ProductController`: actualizar para incluir promoción vigente en index y show
- Nuevo scope en `Product`: `newArrivals()` — created_at >= now()->subDays(30)
- Endpoint `GET /api/products/new` en `ProductController`
- `AdminPromotionController` (admin): index, store, update, destroy
- Rutas admin protegidas con middleware admin

### Frontend

**Tipos**
- `src/types/promotion.ts`: Promotion, DiscountType

**API**
- `src/api/promotions.ts`: getActivePromotions, getNewProducts,
  getAdminPromotions, createPromotion, updatePromotion, deletePromotion

**Componentes**
- Actualizar `ProductCard.tsx`: lógica de badge OFERTA + precio tachado
- Actualizar `ProductPage.tsx`: precio promocional
- `PromotionCarousel.tsx`: scroll horizontal con flechas, acepta array de productos
- `CarouselTabs.tsx`: pestañas "En oferta" / "Nuevos" con estado activo
- Actualizar `HomePage.tsx`: sección carrusel debajo del hero

**Admin**
- `AdminPromotionsPage.tsx`: tabla + modal crear/editar
- Actualizar `AdminDashboardPage.tsx`: card "Promociones"
- Actualizar `App.tsx`: ruta `/admin/promociones`

### Dependencias
- Requiere features 001–009 completas
- Puede desarrollarse en paralelo con feature 015

---

## Tasks

1. [x] Migración: `create_promotions_table`
2. [x] Modelo `Promotion`: scope active(), accessor discounted_price
3. [x] Actualizar `Product`: incluir promoción vigente en respuesta API
4. [x] Endpoint GET /api/promotions/active
5. [x] Endpoint GET /api/products/new (últimos 30 días)
6. [x] `AdminPromotionController`: index, store, update, destroy
7. [x] Rutas en api.php (pública + admin)
8. [x] `src/types/promotion.ts`
9. [x] `src/api/promotions.ts`
10. [x] Actualizar `ProductCard.tsx`: badge OFERTA + precio tachado
11. [x] Actualizar `ProductPage.tsx`: precio promocional destacado
12. [x] Precio promocional en carrito al añadir producto
13. [x] `PromotionCarousel.tsx`: scroll horizontal con flechas nativas
14. [x] `CarouselSection.tsx`: pestañas En oferta / Nuevos (integradas en el mismo componente en vez de un `CarouselTabs.tsx` separado — más simple, sin cambiar el comportamiento)
15. [x] Actualizar `HomePage.tsx`: sección carrusel debajo del hero
16. [x] `AdminPromotionsPage.tsx`: tabla + modal crear/editar
17. [x] Card "Promociones" en `AdminDashboardPage.tsx`
18. [x] Ruta `/admin/promociones` en `App.tsx`
19. [x] php artisan test — sin regresiones (19 fallos preexistentes en FanficTest/CheckoutTest,
    no relacionados — confirmados uno a uno, mismos antes y después de esta feature)
20. [x] Verificación manual completa (ver docs/016-sistema-promociones.md)
21. [x] git commit + push