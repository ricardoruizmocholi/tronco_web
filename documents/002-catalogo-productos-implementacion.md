# 002 — Catálogo de Productos: Decisiones de Implementación

## Modelo de datos

### `price` como `unsignedInteger` (céntimos)
El MCD original sugería `decimal(10,2)`. Se optó por `unsignedInteger` (céntimos enteros) por compatibilidad directa con Stripe, que opera en la unidad mínima de la moneda. Evita errores de redondeo en punto flotante. El frontend formatea con `Intl.NumberFormat` dividiendo entre 100.

### `artist_id` sin `->constrained()`
La tabla `artists` no existe aún (Feature futura). Se añade `artist_id` como `nullable()` sin foreign key para no bloquear la migración. Se añadirá la constraint cuando se implemente la Feature de artistas.

### `image_url` como campo legacy en `products`
El MCD documenta `image_url` como "imagen legacy/fallback, se irá eliminando al migrar a `product_images`". Se mantiene en `$fillable` pero no se usa en los endpoints actuales. La fuente de verdad de imágenes es la tabla `product_images`.

### Tabla `product_images` (relación 1-N)
Añadida en sesión de revisión antes de la Task 8. Cada producto tiene imágenes ordenadas por `position`:
- `position = 1`: imagen principal (mostrada por defecto en card y ficha)
- `position = 2`: imagen hover (se muestra al pasar el ratón en la card)
- `position >= 3`: galería (mostrada como miniaturas en la ficha)

La relación en el modelo: `hasMany(ProductImage::class)->orderBy('position')`.

`cascadeOnDelete` garantiza que al borrar un producto se eliminan sus imágenes.

## Backend

### Paginación con `paginate(12)`
Se eligió 12 en vez de 10 porque 12 es divisible entre 1, 2, 3 y 4 columnas — la grid es responsiva de 1 a 4 columnas, así la primera página siempre queda completa visualmente.

La respuesta pasa de array plano a objeto Laravel paginator:
```json
{
  "data": [...],
  "next_page_url": "http://localhost/api/products?page=2",
  "total": 10,
  "per_page": 12,
  "current_page": 1
}
```

Los tests de `assertJsonCount` se actualizaron a `assertJsonCount(N, 'data')` para apuntar a la clave correcta.

### Soft-delete semántico en `destroy`
`DELETE /api/admin/products/{id}` pone `is_active = false` en vez de borrar el registro. Conserva integridad referencial con futuros `order_items` que referencien el producto. Un producto desactivado devuelve 404 tanto en `index` como en `show`.

### Slug generado en backend
El slug se deriva del `name` con `Str::slug()` en el controlador, nunca se acepta del frontend. Esto garantiza slugs limpios y evita inyección de slugs arbitrarios. Colisiones de slug se detectan a nivel de constraint única en BD (no se duplica la validación en `ProductRequest`).

### `ProductRequest::authorize()` devuelve `true`
El middleware `admin` (alias de `EnsureUserIsAdmin`) ya verifica el rol antes de llegar al Form Request. No hay doble verificación.

## Frontend

### Hover de imagen con CSS puro (no estado)
El efecto de imagen hover en `ProductCard` usa `group`/`group-hover` de Tailwind con `opacity-0`/`opacity-100` y `transition-opacity`. No usa `useState` ni `onMouseEnter` — el CSS es suficiente y más performante para un grid con muchas cards.

### Load more sin reemplazar productos
En `StorePage`, al pulsar "Ver más" los productos nuevos se acumulan con `setProducts(prev => [...prev, ...res.data])`. Al cambiar de categoría se hace reset (`setProducts([])`, `setPage(1)`). Se usa un `ref` (`isLoadMore`) para distinguir ambos casos sin depender de efectos en cascada.

### Miniaturas interactivas en `ProductPage`
Clicar una miniatura actualiza `activeImg` con estado local. El borde `border-primary` indica la imagen activa. La imagen principal tiene `aspect-[3/4]` para simular proporciones de producto textil.

### Botón "Añadir al carrito" deshabilitado
El botón existe en `ProductPage` pero no tiene handler (el carrito es Feature posterior). Si `stock === 0` queda deshabilitado y muestra "No disponible". Si `stock > 0` muestra "Añadir al carrito" habilitado pero sin acción por ahora — se conectará en la Feature de carrito/checkout.

## Seeder

### `firstOrCreate` por `[product_id, position]` en `ProductImage`
El seeder es re-ejecutable sin duplicar imágenes. Si se ejecuta de nuevo solo inserta las que falten. Las imágenes de placeholder usan `placehold.co` con los colores de la identidad visual (`#5BBB2A` = primary, `#8B4A2A` = secondary).

## Mejoras futuras (anotadas, no bloqueantes)
- `AuthController::register()` devuelve el campo `password` hasheado en la respuesta JSON. Debería devolver solo los campos necesarios (se anotó en 001).
- Añadir constraint `UNIQUE(product_id, position)` en `product_images` para evitar duplicados a nivel de BD (actualmente solo lo controla el seeder con `firstOrCreate`).
- Cuando se implemente artistas, añadir `->constrained('artists')` en la migración de `products.artist_id`.
- Búsqueda por texto libre en `/api/products?q=` — fuera del alcance del MVP según la spec.
