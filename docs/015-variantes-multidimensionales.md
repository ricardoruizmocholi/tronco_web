# 015 — Variantes multidimensionales de producto

## Resumen

Reemplaza el sistema de variantes basado únicamente en `size` (texto libre) por un sistema
de **atributos libres** por producto: cualquier combinación de atributos (Color, Talla,
Material, Edición...) puede definirse por producto, y cada combinación forma una variante
(SKU) con stock, precio e imagen propios opcionales. El campo `size` original **no se ha
eliminado** — las variantes migradas lo conservan intacto, y sigue siendo la fuente legacy
para productos que no han sido migrados al nuevo sistema.

```
Product
  └── ProductAttribute (Color, Talla, Material...)
        └── ProductAttributeValue (Rojo #FF0000, S, M, L...)

Product
  └── ProductVariant (SKU: combinación de atributos + stock + precio/imagen propios)
        └── ProductVariantAttribute (FK a ProductAttributeValue, uno por atributo)
```

---

## Archivos creados

**Backend**

| Archivo | Descripción |
|---------|-------------|
| `database/migrations/2026_07_30_150000_create_product_attributes_table.php` | Tabla `product_attributes` |
| `database/migrations/2026_07_30_150001_create_product_attribute_values_table.php` | Tabla `product_attribute_values` |
| `database/migrations/2026_07_30_150002_create_product_variant_attributes_table.php` | Tabla pivote `product_variant_attributes` (único `variant_id`+`attribute_value_id`) |
| `database/migrations/2026_07_30_150003_add_price_override_and_image_to_product_variants_table.php` | `price_override` e `image_url` nullable en `product_variants` |
| `database/migrations/2026_07_30_150004_make_size_nullable_on_product_variants_table.php` | Relaja `size` a nullable (aditivo, reversible, sin tocar datos) |
| `app/Console/Commands/MigrateSizeToAttributeCommand.php` | `php artisan variants:migrate-size-to-attribute` |
| `app/Models/ProductAttribute.php` | `belongsTo(Product)`, `hasMany(ProductAttributeValue)` |
| `app/Models/ProductAttributeValue.php` | `belongsTo(ProductAttribute)`, `belongsToMany(ProductVariant)` |
| `app/Models/ProductVariantAttribute.php` | `belongsTo(ProductVariant)`, `belongsTo(ProductAttributeValue)` |
| `app/Http/Controllers/ProductAttributeController.php` | CRUD admin de atributos y valores |

**Frontend**

| Archivo | Descripción |
|---------|-------------|
| `src/api/attributes.ts` | CRUD de atributos/valores |
| `src/components/ColorSwatch.tsx` | Círculo de color con tooltip, estado seleccionado/agotado/deshabilitado |
| `src/components/AttributeSelector.tsx` | Selector genérico — círculos (color) o botones (text) según el tipo de atributo |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/Models/ProductVariant.php` | `price_override`, `image_url` en fillable; `hasMany(ProductVariantAttribute)`; accessors `effective_price`, `effective_image`, `attribute_values` (aplanado) |
| `app/Models/Product.php` | `hasMany(ProductAttribute)`, `hasOne(ProductImage)` como `firstImage` |
| `app/Http/Controllers/ProductController.php` | `show()` con eager load completo de atributos/variantes; `index()`/`newArrivals()`/`adminIndex()` incluyen atributos (ligero: solo color en listados públicos) |
| `app/Http/Controllers/ProductVariantController.php` | Acepta `attribute_value_ids[]`, `price_override`, `image_url`; valida pertenencia al producto y unicidad de combinación |
| `app/Http/Controllers/CheckoutController.php` | Precedencia de precio: `variant.price_override` > `product.promotion.discounted_price` > `product.price` |
| `routes/api.php` | Rutas admin de atributos/valores |
| `src/types/product.ts` | `ProductAttribute`, `ProductAttributeValue`, `VariantAttributeValue`; `ProductVariant` ampliado; `Product.attributes[]` |
| `src/api/products.ts` | `VariantPayload` con `attribute_value_ids`, `price_override`, `image_url`; `size` opcional |
| `src/pages/ProductPage.tsx` | Selectores por atributo, variante activa por combinación, cambio de imagen, `effective_price` |
| `src/components/ProductCard.tsx` | Swatches de color (máx. 4, +N) |
| `src/components/PreorderModal.tsx` | Ajuste mínimo — etiqueta con fallback si la variante no tiene `size` |
| `src/components/admin/ProductForm.tsx` | Sección "Atributos del producto" (CRUD) + creación de variantes por combinación de atributos + precio/imagen propios |

---

## El comando `variants:migrate-size-to-attribute`

```
docker compose exec backend php artisan variants:migrate-size-to-attribute
```

Migra las variantes existentes (solo `size`) a un atributo **"Talla"** con sus valores
correspondientes, sin tocar el campo `size` en ningún momento.

**Qué hace, paso a paso:**
1. Busca productos con variantes que tengan `size` no nulo/no vacío.
2. Por producto: crea (o reutiliza si ya existe) un `ProductAttribute` llamado "Talla",
   tipo `text`.
3. Por cada valor único de `size` en ese producto: crea (o reutiliza) un
   `ProductAttributeValue` con ese texto como `value` y `label`.
4. Por cada variante: crea (o reutiliza) el `ProductVariantAttribute` que la vincula al
   valor correspondiente.
5. Imprime y loguea cuántos productos, atributos, valores y vínculos se han creado.

**Es idempotente** — usa `firstOrCreate` en cada paso. Ejecutarlo dos veces no duplica nada
(verificado: segunda ejecución reporta 0 creados en las cuatro categorías). Es seguro
volver a correrlo si se añaden productos con `size` nuevos más adelante, o simplemente por
si hay dudas de si ya se ejecutó.

**Cuándo ejecutarlo:** una vez, justo después de desplegar esta feature, para poblar los
atributos de los productos existentes con tallas. Los productos creados después ya usarán
el sistema de atributos desde el principio (aunque `size` sigue disponible como fallback
legacy si un admin lo usa directamente vía API).

---

## Cómo crear un producto con Color + Talla desde el panel admin

1. Ir a `/admin/productos`, crear o editar un producto.
2. En la sección **"Atributos del producto"** (debajo de Variantes):
   - "+ Añadir atributo" → nombre `Color`, tipo `color` → Crear.
   - "+ Añadir atributo" → nombre `Talla`, tipo `texto` → Crear (o usar el que ya trajo
     la migración de datos, si el producto tenía tallas previas).
   - Dentro de "Color": "+ Añadir valor" → label `Rojo`, selector de color hex → Añadir.
     Repetir para cada color.
   - Dentro de "Talla": "+ Añadir valor" → label `S`, valor `S` → Añadir. Repetir S/M/L/XL.
3. En la sección **"Variantes / Stock"** (encima de Atributos): para cada combinación
   (p. ej. Rojo + S), seleccionar un valor en cada `<select>` de atributo, indicar stock,
   y opcionalmente precio propio (en euros, vacío = precio base del producto) e imagen
   propia (URL, vacío = primera imagen del producto) → "+ Añadir variante".
4. El backend rechaza automáticamente una combinación repetida (p. ej. dos variantes
   "Rojo / S") con un mensaje de error explícito.

---

## Gotchas importantes

### `$hidden` filtra por el nombre camelCase de la relación, no por la clave JSON
Al ocultar la relación cruda `variantAttributes` en `ProductVariant` (para exponer solo el
accessor aplanado `attribute_values`), el primer intento usó
`protected $hidden = ['variant_attributes']` (snake_case, como aparece en el JSON) — y
**no funcionó**: la relación seguía apareciendo en la respuesta. La razón: Eloquent filtra
`$hidden` contra `$this->relations`, que está indexado por el nombre **exacto del método**
de relación tal como se invocó (`variantAttributes`, camelCase) — la conversión a
snake_case (`variant_attributes`) ocurre **después** del filtrado, al construir el array
final. La clave correcta en `$hidden` es `'variantAttributes'` (y, por el mismo motivo,
`'product'` para ocultar la relación que `effective_price`/`effective_image` cargan de
forma perezosa — en este caso coincide en ambas formas porque es una sola palabra, pero el
principio es el mismo). Si en el futuro se oculta otra relación con nombre compuesto,
recordar usar el nombre del método, no la clave serializada.

### Precedencia de precio: variante > promoción > precio base
`CheckoutController` calcula el precio unitario como
`variant.price_override ?? product.promotion?.discounted_price ?? product.price`. Un precio
propio de variante es una decisión deliberada del admin y **siempre gana** sobre cualquier
promoción de catálogo — evita la ambigüedad de "¿se aplica el descuento también al precio
especial de la variante?" sin tener que definir esa regla de negocio. Verificado en tinker:
variante sin `price_override` con una promoción del 20 % activa usa el precio descontado;
la misma variante con `price_override` propio lo usa tal cual, ignorando la promoción.

### Migración de `size` a nullable — sin `doctrine/dbal`
La primera versión de la migración que relaja `size` a nullable usaba SQL crudo
(`ALTER TABLE ... MODIFY`), específico de MySQL. Rompió 60 tests porque el test suite corre
sobre SQLite (que no entiende `MODIFY`). Laravel 12 no requiere `doctrine/dbal` para
`->nullable()->change()` — funciona nativamente tanto en MySQL como en SQLite. La migración
final usa el Schema Builder (`Blueprint::change()`), portable entre ambos motores.

### Unicidad de combinación de atributos — incluye la combinación vacía
`ProductVariantController::validateComboUnique()` compara los `attribute_value_ids`
ordenados de cada variante. Si un producto no tiene atributos definidos, la combinación de
cualquier variante es un array vacío — por lo que **como mucho una** variante sin atributos
puede existir por producto (la segunda se rechazaría por "combinación duplicada"). Esto es
intencional: si se necesitan varias variantes, hay que definir al menos un atributo que las
distinga.

### `effective_price` / `effective_image` acceden a `$this->product` de forma perezosa
Si la variante no se carga con `Product::with('variants.product')` (no es necesario en el
flujo normal, ya que `ProductController@show` ya carga el producto padre), cada acceso a
`effective_price`/`effective_image` sin promoción/imagen propia dispara una query extra por
variante. A la escala actual del catálogo (unidades de variantes por producto) esto es
irrelevante; si el catálogo creciera mucho, sería el primer punto a optimizar con eager
loading explícito de `variants.product`.

### El campo `size` sigue vivo, a propósito
Por restricción explícita de esta feature, `size` no se elimina. Los productos migrados lo
conservan (aunque ya no se usa para mostrar el selector — se sustituye por el atributo
"Talla" migrado). Las variantes nuevas creadas vía el sistema de atributos simplemente no
lo rellenan (queda `null`, ya que la columna se relajó a nullable). Una futura feature de
limpieza podría eliminarlo una vez se confirme que ningún flujo depende de él — de momento
`ProductCard`, `ProductPage`, `PreorderModal` y `CheckoutController` usan `size` como
fallback legacy antes de recurrir a `attribute_values` para construir la etiqueta mostrada.
