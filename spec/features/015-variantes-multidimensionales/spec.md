# 015 — Variantes multidimensionales de producto

## Spec

### Qué hace
Reemplaza el sistema de variantes simple (solo `size`) por un sistema de
atributos libres que permite definir cualquier combinación de atributos
por producto (color, talla, material, edición...). Cada combinación de
atributos forma una SKU con stock, precio e imagen propios.

### Modelo de datos objetivo

```
Product
  └── ProductAttribute (color, talla, material...)
        └── ProductAttributeValue (Rojo, Verde, S, M, L...)

Product
  └── ProductVariant (SKU: combinación de atributos)
        └── ProductVariantAttribute (FK a ProductAttributeValue)
```

Ejemplo:
- Atributo "Color" → valores: Rojo (#FF0000), Verde (#5BBB2A)
- Atributo "Talla" → valores: S, M, L, XL
- Variante "Rojo / S" → precio: 2500, stock: 10, imagen propia
- Variante "Verde / M" → precio: 2500, stock: 5, sin imagen propia (hereda la del producto)

### Criterios de aceptación

**Backend**
- [x] Tabla `product_attributes`: id, product_id, name, type (text|color), position
- [x] Tabla `product_attribute_values`: id, attribute_id, value (texto o hex), label, position
- [x] Tabla `product_variant_attributes`: id, variant_id, attribute_value_id (FK)
- [x] `ProductVariant` ampliado: price_override (int nullable, céntimos), image_url (string nullable)
- [x] Si price_override es null → usar el precio base del Product
- [x] Si image_url es null → usar la primera imagen del Product
- [x] Endpoint GET /api/products/{id} devuelve atributos + valores + variantes con sus combinaciones
- [x] Panel admin: CRUD completo de atributos y valores por producto
- [x] Panel admin: al crear/editar variante, seleccionar combinación de atributos
- [x] Validar unicidad de combinación de atributos por producto (no dos variantes con los mismos atributos)

**Frontend — ficha de producto**
- [x] Selectores independientes por atributo (uno por fila): "Color", "Talla"...
- [x] Para atributos tipo `color`: mostrar círculos de color con tooltip del label
- [x] Para atributos tipo `text`: mostrar botones de texto (como el selector de talla actual)
- [x] Al seleccionar una combinación, resaltar la variante activa y mostrar su precio
- [x] Si la variante seleccionada tiene image_url propia → cambiar la imagen principal del producto
- [x] Si la variante no tiene stock → mostrar "Agotado" en ese selector
- [x] El carrito guarda variant_id (sin cambios en la estructura del carrito)

**Frontend — ProductCard**
- [x] Mostrar círculos de color disponibles (máx. 4, +N si hay más)
- [x] Badge de atributos clave visibles sin entrar a la ficha

**Panel admin**
- [x] En AdminProductsPage: al editar un producto, sección "Atributos" con CRUD
- [x] Añadir atributo → nombre + tipo (texto o color)
- [x] Añadir valor al atributo → valor + label (para colores: picker de color hex)
- [x] Al crear variante: seleccionar un valor por cada atributo definido
- [x] Variante puede tener precio propio (opcional) e imagen propia (opcional)
- [x] Migración de datos: las variantes existentes (solo size) se migran como
  atributo "Talla" con su valor correspondiente

### Fuera de alcance
- Generación automática de todas las combinaciones posibles (post-MVP)
- Atributos compartidos entre productos (post-MVP)
- Filtros en la tienda por color o atributo (post-MVP — feature 015b)

---

## Plan

### Backend

**Migraciones**
- `create_product_attributes_table`
- `create_product_attribute_values_table`
- `create_product_variant_attributes_table`
- `add_price_override_and_image_to_product_variants_table`
- `migrate_existing_size_variants`: script de migración de datos que convierte
  el campo `size` existente en un atributo "Talla" con sus valores

**Modelos**
- `ProductAttribute`: belongsTo Product, hasMany ProductAttributeValue
- `ProductAttributeValue`: belongsTo ProductAttribute, belongsToMany ProductVariant
- `ProductVariant`: ampliado con price_override, image_url, hasMany ProductVariantAttribute
- `ProductVariantAttribute`: belongsTo ProductVariant, belongsTo ProductAttributeValue

**Controladores**
- `ProductAttributeController` (admin): CRUD atributos + valores
- `ProductVariantController`: actualizar para incluir atributos en respuesta
- `ProductController`: actualizar eager loading para incluir atributos en show()

### Frontend

**Tipos**
- `src/types/product.ts`: añadir `ProductAttribute`, `ProductAttributeValue`,
  `ProductVariantAttribute`. Actualizar `ProductVariant` con `price_override`,
  `image_url`, `attribute_values`

**Componentes**
- `AttributeSelector.tsx`: selector genérico — recibe atributo y renderiza
  círculos (color) o botones (text) según el tipo
- `ColorSwatch.tsx`: círculo de color con tooltip y estado seleccionado/agotado
- Actualizar `ProductPage.tsx`: reemplazar selector de talla por `AttributeSelector`
  dinámico por cada atributo; lógica para encontrar la variante activa según selección
- Actualizar `ProductCard.tsx`: mostrar swatches de color si hay atributo tipo color

**Admin**
- Actualizar `ProductForm.tsx` / `AdminProductsPage.tsx`: sección de atributos con CRUD

### Dependencias
- Requiere features 001–008 completas
- La feature 016 (promociones) puede correr en paralelo — no depende de esta

---

## Tasks

1. [x] Migración: `product_attributes`
2. [x] Migración: `product_attribute_values`
3. [x] Migración: `product_variant_attributes`
4. [x] Migración: añadir `price_override` e `image_url` a `product_variants` (+ `size` relajado a nullable, confirmado)
5. [x] Script migración de datos: `size` existente → atributo "Talla"
6. [x] Modelo `ProductAttribute` con relaciones
7. [x] Modelo `ProductAttributeValue` con relaciones
8. [x] Actualizar `ProductVariant`: nuevos campos + relaciones
9. [x] `ProductAttributeController` (admin): CRUD atributos
10. [x] `ProductAttributeController` (admin): CRUD valores por atributo
11. [x] Actualizar `ProductController@show`: eager load atributos + valores + variantes
12. [x] Actualizar `ProductVariantController`: incluir atributos en respuesta
13. [x] Validar unicidad de combinación de atributos por producto
14. [x] Actualizar `src/types/product.ts` con nuevos tipos
15. [x] `ColorSwatch.tsx`: círculo de color con tooltip
16. [x] `AttributeSelector.tsx`: selector genérico color/text
17. [x] Actualizar `ProductPage.tsx`: selectores dinámicos por atributo
18. [x] Lógica para encontrar variante activa según combinación seleccionada
19. [x] Cambio de imagen al seleccionar variante con image_url propia
20. [x] Actualizar `ProductCard.tsx`: swatches de color
21. [x] Panel admin: sección atributos en formulario de producto
22. [x] Panel admin: CRUD valores por atributo con color picker
23. [x] Panel admin: selector de atributos al crear/editar variante
24. [x] Verificar migración de datos de variantes existentes (4 variantes → atributo Talla,
    idempotente, comprobado con doble ejecución del comando)
25. [x] php artisan test — sin regresiones (19 fallos preexistentes idénticos, confirmados
    antes y después de esta feature)
26. [x] Verificación manual completa (ver docs/015-variantes-multidimensionales.md)
27. [x] git commit + push