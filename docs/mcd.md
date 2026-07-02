# Modelo Conceptual de Datos (MCD/MER) — Troncodrilo Shop

## 1. Entidades y atributos

### users
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| name | varchar | |
| email | varchar unique | |
| password | varchar | hash |
| role | enum(user, admin) | default `user` |
| email_verified_at | timestamp nullable | |
| created_at / updated_at | timestamp | |

### categories
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| name | varchar | |
| slug | varchar unique | |
| created_at / updated_at | timestamp | |

### products
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| category_id | bigint FK → categories.id | nullable |
| artist_id | bigint FK → artists.id | nullable |
| name | varchar | |
| slug | varchar unique | |
| description | text | |
| price | decimal(10,2) | ver nota sobre céntimos abajo |
| stock | int | |
| image_url | varchar | nullable — imagen legacy/fallback, se irá eliminando al migrar a product_images |
| is_active | boolean | default true |
| created_at / updated_at | timestamp | |

### product_images
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| product_id | bigint FK → products.id | cascade delete |
| url | varchar | |
| position | int | orden de visualización, 1 = principal, 2 = hover, 3+ = galería |
| created_at / updated_at | timestamp | |

### artists
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| user_id | bigint FK → users.id | nullable |
| name | varchar | nombre artístico |
| bio | text | |
| avatar_url | varchar | |
| social_links | json | |
| is_active | boolean | default true |
| created_at / updated_at | timestamp | |

### orders
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| user_id | bigint FK → users.id | |
| status | enum(pending, paid, failed, shipped, cancelled) | |
| total | decimal(10,2) | recalculado en backend |
| stripe_payment_intent_id | varchar nullable | |
| shipping_address | json | |
| created_at / updated_at | timestamp | |

### order_items
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| order_id | bigint FK → orders.id | |
| product_id | bigint FK → products.id | |
| quantity | int | |
| unit_price | decimal(10,2) | precio congelado al momento de compra |
| created_at / updated_at | timestamp | |

### fanfics
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| user_id | bigint FK → users.id **unique** | un fanfic por usuario |
|prioritario|boolean|
| title | varchar | |
| content | text | |
| latitude | decimal(10,7) | |
| longitude | decimal(10,7) | |
| status | enum(pending, approved, rejected) | default `pending` |
| rejection_reason | text nullable | |
| reviewed_by | bigint FK → users.id nullable | admin que revisó |
| reviewed_at | timestamp nullable | |
| created_at / updated_at | timestamp | |

## 2. Relaciones

- `users 1—N orders`
- `orders 1—N order_items`
- `products 1—N order_items`
- `categories 1—N products`
- `artists 1—N products` (opcional)
- `users 1—1 artists` (opcional, un artista puede tener cuenta vinculada)
- `users 1—1 fanfics` (estricta: constraint unique en `fanfics.user_id`)
- `users 1—N fanfics.reviewed_by` (un admin revisa muchos fanfics)
- `products 1—N product_images` — un producto tiene múltiples imágenes ordenadas por posición
## 3. Reglas de negocio derivadas del modelo

1. Un fanfic solo existe si `user_id` no tiene ya otro → `UNIQUE` en migración.
2. Un fanfic solo es visible en el mapa si `status = approved`.
3. `orders.total` se calcula en backend sumando `order_items.quantity * order_items.unit_price`, nunca se acepta el total del frontend.
4. `order_items.unit_price` congela el precio en el momento de la compra.
5. Solo `role = admin` puede cambiar `fanfics.status` o gestionar `artists`/`products`.

## 4. Pendiente de decidir al implementar
- Si `products` necesita variantes (tallas/colores) — el modelo actual asume producto simple para el MVP.
- Precio en `decimal` (euros) vs `integer` (céntimos). Recomendado: céntimos enteros, evita errores de redondeo con Stripe.