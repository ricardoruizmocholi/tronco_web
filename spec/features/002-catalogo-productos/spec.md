# 002 — Catálogo de Productos

## Spec

### Qué hace
Listado y ficha de producto del merchandising de Troncodrilo, con
categorías y filtro. Gestión de productos restringida a admin.

### Criterios de aceptación
- [x] Cualquier visitante puede ver el listado de productos sin necesidad de login
- [x] El listado se puede filtrar por categoría
- [x] Cada producto tiene página de ficha con imagen, nombre, descripción, precio y stock disponible
- [x] Si `stock = 0`, se muestra "agotado" y no se puede añadir al carrito
- [x] Solo productos con `is_active = true` aparecen en el listado público
- [x] Un admin puede crear, editar y desactivar productos vía endpoints protegidos
- [x] Un producto puede opcionalmente estar asociado a un artista colaborador (`artist_id`)

### Fuera de alcance
- Variantes de producto (tallas/colores) — fase post-MVP
- Búsqueda por texto libre — opcional, valorar si hay tiempo

---

## Plan

### Backend
- Migraciones: `categories`, `products`
  - `categories`: id, name, slug, timestamps
  - `products`: id, category_id (FK nullable), artist_id (FK nullable), name, slug, description, price, stock, image_url, is_active, timestamps
- Modelos Eloquent con relaciones (`Product belongsTo Category`, `Product belongsTo Artist`)
- Endpoints públicos: `GET /api/products`, `GET /api/products/{slug}`, `GET /api/categories`
- Endpoints admin: `POST /api/admin/products`, `PUT /api/admin/products/{id}`, `DELETE /api/admin/products/{id}` (soft: `is_active = false`)
- Form Request `ProductRequest`: precio positivo, stock >= 0

### Frontend
- Página `/tienda` con grid de productos y filtro por categoría (query param)
- Página `/producto/:slug` con ficha completa
- Componente `ProductCard` reutilizable
- Panel admin básico: `/admin/productos` (listado + formulario crear/editar)

### Dependencia
Requiere `001-autenticacion` completa (para proteger endpoints de admin).

---

## Tasks

1. [x] Migraciones `categories` y `products`
2. [x] Modelos `Category` y `Product` con relaciones
3. [x] Seeder de categorías y productos demo de Troncodrilo
4. [x] `ProductController` (índice público, show, store/update/destroy admin)
5. [x] `ProductRequest` con reglas de validación
6. [x] Tests Feature: listado público, ficha de producto, creación bloqueada sin rol admin
7. [x] Frontend: página `/tienda` con grid + filtro
8. [x] Frontend: página de ficha de producto
9. [x] Frontend: panel admin de productos
10. [x] Verificar los 7 criterios de aceptación