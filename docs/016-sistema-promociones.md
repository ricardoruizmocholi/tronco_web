# 016 — Sistema de promociones

## Resumen

Permite crear promociones (descuento porcentual o fijo, con vigencia opcional por fechas y toggle
manual) sobre productos individuales del catálogo. Los productos en promoción muestran un badge
"OFERTA", precio tachado y precio rebajado en `ProductCard` y `ProductPage`. La landing page añade
una sección con carrusel de scroll horizontal ("En oferta" / "Nuevos") debajo del hero. El precio
promocional se respeta de extremo a extremo: desde la ficha hasta el `Checkout` real con Stripe.

---

## Archivos creados

**Backend**

| Archivo | Descripción |
|---------|-------------|
| `database/migrations/2026_07_30_140000_create_promotions_table.php` | Tabla `promotions` |
| `app/Models/Promotion.php` | `belongsTo(Product)`, scope `active()`, accessors `original_price`/`discounted_price`/`status`, helper estático `overlapsExisting()` |
| `app/Http/Controllers/PromotionController.php` | `GET /api/promotions/active` (público) |
| `app/Http/Controllers/AdminPromotionController.php` | CRUD admin: `index`, `store`, `update`, `destroy` |

**Frontend**

| Archivo | Descripción |
|---------|-------------|
| `src/types/promotion.ts` | `DiscountType`, `PromotionStatus`, `ProductPromotion`, `Promotion` |
| `src/api/promotions.ts` | `getActivePromotions`, `getNewProducts`, `getAdminPromotions`, `createPromotion`, `updatePromotion`, `deletePromotion` |
| `src/components/PromotionCarousel.tsx` | Scroll horizontal con flechas SVG nativas (sin librería), `snap-x` táctil en móvil |
| `src/components/CarouselSection.tsx` | Carga `/api/promotions/active` + `/api/products/new`, pestañas "En oferta"/"Nuevos" (oculta las vacías, oculta toda la sección si ambas lo están) |
| `src/pages/admin/AdminPromotionsPage.tsx` | Stats (activas/programadas/expiradas este mes) + tabla + modal crear/editar |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/Models/Product.php` | `hasOne(Promotion)->active()` como relación `promotion`; scope `newArrivals()` (últimos 30 días) |
| `app/Http/Controllers/ProductController.php` | `index`/`show` cargan `promotion`; nuevo `newArrivals()` → `GET /api/products/new` |
| `app/Http/Controllers/CheckoutController.php` | Usa `discounted_price` (si hay promoción vigente) en vez de `price` al calcular `$total`, el `unit_amount` de Stripe y el `unit_price` congelado en `OrderItem` |
| `routes/api.php` | Rutas públicas (`/products/new`, `/promotions/active`) y admin (`/admin/promotions*`) |
| `src/types/product.ts` | `promotion?: ProductPromotion \| null` en `Product` |
| `src/components/ProductCard.tsx` | Badge "OFERTA", precio tachado + rebajado, `handleAddToCart` usa `discounted_price` |
| `src/pages/ProductPage.tsx` | Precio tachado + rebajado, `handleAddToCart` usa `discounted_price` |
| `src/pages/HomePage.tsx` | Monta `<CarouselSection />` debajo del hero |
| `src/pages/admin/AdminDashboardPage.tsx` | Card "Promociones" |
| `src/App.tsx` | Ruta `/admin/promociones` con `<AdminRoute>` |

---

## Decisiones técnicas

### 1. `discounted_price` y `original_price` como accessors del modelo, no del controlador
Se calculan en `Promotion` (`$appends`) en vez de construirse ad-hoc en cada controlador. Así
`AdminPromotionController`, `ProductController` y `CheckoutController` obtienen el mismo número sin
triplicar la fórmula `price * (1 - value/100)` / `price - value`. Clamp a `0` como mínimo — un
descuento fijo mayor que el precio nunca da un precio negativo (aunque además se valida en el
`store`/`update` del admin para que ni siquiera se pueda crear esa promoción).

### 2. `Promotion::product` oculto (`$hidden`) para evitar anidado circular
`discounted_price`/`original_price` acceden a `$this->product->price` (lazy load). Sin
`protected $hidden = ['product']`, la relación cargada quedaba expuesta en el JSON, produciendo
`product.promotion.product.promotion...` conceptualmente circular (en la práctica solo un nivel,
pero redundante: el producto ya se está sirviendo como padre). Se oculta explícitamente.

### 3. `Product::promotion` como `hasOne(...)->active()` — el filtro de vigencia vive en el modelo
El scope `active()` (mismo que usa `AdminPromotionController` indirectamente a través del propio
modelo) se reutiliza tanto para decidir qué promoción devolver embebida en un producto como para
`PromotionController@active` (`whereHas('promotion')`). Una promoción `scheduled` o `expired`
nunca llega al frontend público — verificado en `tinker`: con una promoción con `starts_at` futuro
o `ends_at` pasado, `Product::with('promotion')->find($id)->promotion` es `null`, aunque el registro
exista y el panel admin sí la vea (con su `status` correspondiente).

### 4. Solapamiento de fechas: intervalos completos, no solo "activa ahora"
`Promotion::overlapsExisting()` compara `[starts_at, ends_at]` tratando `NULL` como "sin límite" en
ese extremo, y bloquea cualquier solapamiento — incluidos los futuros. Una promoción sin `ends_at`
(vigente indefinidamente) bloquea la creación de cualquier otra promoción del mismo producto con
cualquier fecha de inicio posterior, porque sigue "activa" en ese momento. Verificado en `tinker`.
No se compara contra promociones con `is_active=false` — el admin puede desactivar una y crear otra
en las mismas fechas sin conflicto.

### 5. `CheckoutController` recalcula con `discounted_price` — el punto más importante de la feature
Sin este cambio, el descuento habría sido puramente cosmético: el usuario vería el precio rebajado
en la ficha pero pagaría el precio completo en Stripe, porque `CheckoutController::store()` siempre
recalculaba el total con `$product->price` (ver `AGENTS.md`: "el backend recalcula el total... nunca
confiar en el precio del frontend" — aquí el propio recálculo del backend era el problema). Ahora
`Product::with('promotion')` se carga junto al producto en el checkout y
`$product->promotion?->discounted_price ?? $product->price` decide el precio unitario tanto para el
`total`, como para el `unit_amount` de cada `line_item` de Stripe, como para el `unit_price`
congelado en `OrderItem` (igual que ya se congela el precio normal — el comportamiento de "precio
congelado en el momento de compra" de la feature 004 se mantiene sin cambios, solo cambia qué precio
se congela).

### 6. Selector de producto en el admin: input de búsqueda + `<select>`, sin librería nueva
`AdminPromotionsPage` filtra `getAdminProducts()` en memoria según un input de texto y alimenta un
`<select>` nativo con el resultado — sin introducir una librería de combobox solo para esto,
consistente con la restricción de "no instalar librerías" también aplicada al carrusel.

### 7. `CarouselTabs.tsx` no se creó como archivo separado
El plan original preveía un componente aparte para las pestañas. Se integraron directamente en
`CarouselSection.tsx` — es un puñado de botones con estado local, separarlo en otro archivo solo
añadía indirección sin beneficio real.

---

## Cómo probar manualmente

1. **Sin promoción**: cualquier producto sin promoción muestra precio normal y ningún badge en
   `ProductCard`/`ProductPage`.
2. **Crear promoción activa**: `/admin/promociones` → "+ Nueva promoción" → elegir producto, tipo
   `percent`, valor `20`, sin fechas, activa → guardar. El badge "OFERTA" y el precio tachado deben
   aparecer inmediatamente en `/tienda` y en la ficha del producto.
3. **Fecha futura (`scheduled`)**: crear otra promoción con "Inicio" en el futuro → aparece en la
   tabla admin con badge azul "Programada", pero el producto en `/tienda` sigue mostrando el precio
   normal (no vigente aún).
4. **Fecha pasada (`expired`)**: editar `ends_at` a una fecha pasada → badge gris "Expirada" en el
   admin, el producto deja de mostrar el descuento en la tienda.
5. **Solapamiento**: con una promoción activa sin `ends_at`, intentar crear otra del mismo producto
   con cualquier fecha de inicio futura → el formulario debe rechazarlo con el mensaje de
   solapamiento.
6. **Carrusel landing**: en la home, bajo el hero, debe aparecer "Ofertas y novedades" con pestaña
   "En oferta" mostrando el producto del paso 2. Si además hay productos creados en los últimos 30
   días, aparece la pestaña "Nuevos". Si se eliminan todas las promociones y no hay productos
   nuevos, la sección entera desaparece de la home.
7. **Precio en el carrito**: añadir al carrito el producto en oferta → el importe en el
   `CartDrawer` y en el checkout debe ser el precio rebajado, no el original.
8. **Checkout real**: completar un checkout de prueba con Stripe (modo test) sobre un producto en
   oferta → el importe cobrado en Stripe debe coincidir con el `discounted_price`, no con `price`.
9. **Editar / eliminar**: editar una promoción existente (cambiar el valor) y eliminarla — la tabla
   y la ficha del producto deben reflejar el cambio sin recargar la página.

---

## Gotchas y notas futuras

- **Un producto solo puede tener una promoción "vigente" a la vez** por diseño (`hasOne`,
  no `hasMany`) — el solapamiento de fechas en el admin existe precisamente para que nunca haya dos
  promociones activas simultáneas del mismo producto que compitan por esa relación.
- **`discount_value` en céntimos para `fixed`, entero plano para `percent`** — el formulario admin
  convierte euros a céntimos (`Math.round(valor * 100)`) solo cuando el tipo es `fixed`, igual que
  el resto de precios de la app (consistente con `ProductForm.tsx`).
- **`newArrivals()` no tiene límite de "solo si is_active"** aparte del `where('is_active', true)`
  explícito en `ProductController@newArrivals` — el scope en sí solo filtra por fecha; se aplica
  siempre junto al filtro de activo, nunca solo.
- **Sin caché**: `/api/promotions/active` y `/api/products/new` se consultan en cada carga de la
  home. Con un catálogo pequeño (decenas de productos) no es un problema; si el catálogo creciera
  mucho, cachear estas dos respuestas unos minutos sería la primera optimización razonable.
- **Feature 017 (rediseño estético) aún no implementada**: el badge "OFERTA" se construyó ya sin
  `border-radius` (uppercase, tracking-wide) siguiendo el spec de esta feature tal cual se pidió,
  pero el resto de `ProductCard`/`ProductPage` sigue con el estilo redondeado/con sombra actual. Al
  implementar la 017, revisar que el badge y los precios promocionales encajen con el nuevo sistema
  visual (la propia spec de 017 ya lo anticipa como dependencia cruzada).
