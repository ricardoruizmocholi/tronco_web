# 012 — Preorder y lista de espera

## Resumen

Sistema de lista de espera para productos agotados. El admin activa `allow_preorder` por
producto; cuando `stock = 0` y `allow_preorder = true`, la ficha muestra un botón "Reservar plaza"
que abre un modal. Usuarios autenticados ya tienen el email prefilled; usuarios anónimos solo
necesitan introducir su email. El admin gestiona las reservas en `/admin/preorders` con filtros,
stats y exportación CSV.

---

## Archivos creados

### Backend

| Archivo | Descripción |
|---------|-------------|
| `database/migrations/2026_07_15_100000_add_allow_preorder_to_products_table.php` | Añade `allow_preorder boolean default false` a la tabla `products` |
| `database/migrations/2026_07_15_100001_create_preorders_table.php` | Crea tabla `preorders`: id, user_id (FK nullable), product_id (FK), variant_id (FK nullable), email, name, status enum, timestamps. Unique constraint en `(email, product_id, variant_id)` |
| `app/Models/Preorder.php` | Modelo con fillable, casts datetime, relaciones `user`, `product`, `variant` |
| `app/Http/Controllers/PreorderController.php` | `POST /api/preorders` — valida allow_preorder activo, stock=0, duplicado; acepta auth opcional |
| `app/Http/Controllers/AdminPreorderController.php` | index (filtros+paginación), stats, notify (marca como `notified`), export CSV con `StreamedResponse` + `fputcsv` |
| `app/Http/Requests/StorePreorderRequest.php` | Validación: product_id (exists), variant_id (nullable exists), email (required), name (nullable) |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `src/frontend/src/api/preorders.ts` | Funciones: `createPreorder`, `getAdminPreorders`, `getPreorderStats`, `notifyPreorder`, `exportPreorders` (responseType blob) |
| `src/frontend/src/components/PreorderModal.tsx` | Modal con campo email (prefilled si autenticado) + nombre opcional para anónimos. Muestra confirmación post-submit |
| `src/frontend/src/pages/admin/AdminPreordersPage.tsx` | Página admin: stats cards (total/pending/notified/converted + top product), filtros (email/status/fechas), tabla paginada, botón "Marcar notificado" por fila, exportación CSV |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/Models/Product.php` | `allow_preorder` en `$fillable`, `$attributes`, `$casts` (boolean); relación `hasMany(Preorder)` |
| `app/Http/Controllers/ProductController.php` | Nuevo método `togglePreorder`: invierte `allow_preorder` sin tocar `is_active` ni stock |
| `routes/api.php` | Ruta pública `POST /api/preorders`; rutas admin (stats, export, index, notify) con estáticas antes de `{preorder}`; `PATCH /admin/products/{product}/toggle-preorder` |
| `src/types/product.ts` | Añadido `allow_preorder: boolean` al interface `Product` |
| `src/api/products.ts` | Añadida función `togglePreorder(id)` |
| `src/pages/ProductPage.tsx` | `canPreorder = isSoldOut && product.allow_preorder`; renderiza botón "Reservar plaza" en lugar de "No disponible" cuando aplica; monta `<PreorderModal>` |
| `src/components/ProductCard.tsx` | Badge "Preorder" (fondo `bg-ink`) cuando `canPreorder`, en lugar de badge "Agotado" rojo |
| `src/pages/admin/AdminProductsPage.tsx` | Nueva columna "Preorder" con toggle circular por fila (icono reloj, verde si activo) |
| `src/pages/admin/AdminDashboardPage.tsx` | Card "Preorders" con icono reloj en el dashboard |
| `src/App.tsx` | Ruta `/admin/preorders` dentro de `<AdminRoute>` |

---

## Decisiones técnicas

### 1. Preorder anónimo vs. redirigir al login
La spec (criterio 3) decía "usuario no autenticado es redirigido al login", pero el criterio 8
lo contradecía: "puede reservar dejando solo su email". Se siguió el **criterio 8**: la ruta
`POST /api/preorders` es pública (sin `auth:sanctum`), `user_id` es nullable, y el modal
siempre muestra el campo email. Para usuarios autenticados, el email se prerellena desde el
contexto de auth y no se puede editar.

### 2. CSV sin dependencias nuevas
El export usa `StreamedResponse` de Symfony (ya incluido en Laravel) con `fputcsv` nativo de
PHP, sin instalar maatwebsite/excel ni ningún paquete adicional. El chunk de 200 registros evita
cargar toda la tabla en memoria.

### 3. Toggle allow_preorder aislado del estado del producto
`togglePreorder` en `ProductController` solo actualiza `allow_preorder`. No toca `is_active`
ni `stock`. Un producto puede estar activo con `allow_preorder = true` y stock > 0 (en ese caso
se muestra el botón de carrito normal, no el preorder). El botón "Reservar" solo aparece
cuando `isSoldOut && allow_preorder`.

### 4. Unique constraint en BD + validación en controller
El constraint único `(email, product_id, variant_id)` está en la migración como índice único
de BD. El controller comprueba duplicados explícitamente antes de insertar para devolver un
422 con mensaje legible al usuario, sin depender de capturar la excepción de BD.

---

## Cómo probar manualmente

### Flujo admin (activar preorder en un producto)
1. Ir a `/admin/productos` como admin
2. En la columna "Preorder", hacer click en el botón circular de un producto con stock 0
3. El icono se pone verde — `allow_preorder` está activo

### Flujo usuario autenticado
1. Ir a la ficha del producto agotado con preorder activo (`/producto/:slug`)
2. Verificar que aparece el botón "Reservar plaza" (fondo oscuro) en lugar de "No disponible"
3. Hacer click → se abre `PreorderModal` con el email prefilled
4. Pulsar "Apuntarme" → mensaje de confirmación
5. Intentar de nuevo con el mismo email → error 422 "Ya tienes una reserva para este producto"

### Flujo usuario anónimo
1. Sin sesión, ir a la ficha del mismo producto
2. El botón "Reservar plaza" también aparece (la ruta es pública)
3. Abrir modal → campo email vacío + campo nombre opcional
4. Introducir email y pulsar "Apuntarme" → confirmación

### Panel de admin (`/admin/preorders`)
1. Verificar stats cards (total, pendientes, notificados, convertidos, top product)
2. Filtrar por email, estado o fechas → tabla se actualiza
3. En una fila con estado "Pendiente", pulsar "Marcar notificado" → estado cambia a "Notificado"
4. Pulsar "Exportar CSV" → descarga archivo `.csv` con los filtros activos

### ProductCard en tienda
1. Ir a `/tienda`
2. El producto con preorder activo muestra badge negro "Preorder" en lugar del rojo "Agotado"

---

## Gotchas y notas futuras

- **Migrar en staging**: las dos migraciones alteran `products` y crean `preorders`. En producción
  ejecutar `php artisan migrate` — son non-destructivas.

- **`variant_id` nullable en unique**: MySQL trata dos NULLs como distintos en un índice único,
  lo que permitiría que un usuario registrara múltiples preorders sin variante del mismo producto.
  La comprobación en el controller (`where('variant_id', $variantId)` con NULL propagado como
  `whereNull`) cubre este caso correctamente en todos los motores.

- **Notificación por email no implementada**: `AdminPreorderController@notify` solo cambia el
  status a `notified`. El envío real de emails requiere configurar un driver de mail (Feature 013
  o similar) e invocar un Mailable/Notification desde aquí.

- **Sin pago anticipado**: el preorder es solo una expresión de interés. No hay integración con
  Stripe ni reserva de stock. Si se añade pago en el futuro, el campo `status = 'converted'`
  ya está previsto.

- **Export CSV codificación**: el CSV se genera sin BOM UTF-8. Si Excel en Windows muestra
  caracteres mal, abrir como datos externos o añadir `"\xEF\xBB\xBF"` al inicio del stream.
