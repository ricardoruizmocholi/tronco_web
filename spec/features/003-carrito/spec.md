# 003 — Carrito de Compra

## Spec

### Qué hace
Permite añadir, modificar cantidad y eliminar productos del carrito
antes de pasar al checkout.

### Criterios de aceptación
- [x] Un usuario (logueado o no) puede añadir un producto al carrito
- [x] El carrito persiste en `localStorage` para invitados
- [x] Se puede cambiar la cantidad de un producto en el carrito, respetando el stock disponible
- [x] Se puede eliminar un producto del carrito
- [x] El carrito muestra subtotal correcto en tiempo real
- [x] No se puede añadir más cantidad que el stock disponible del producto
- [x] El carrito se vacía tras un checkout exitoso

### Fuera de alcance
- Carrito multi-dispositivo persistente para invitados
- Guardar para más tarde / lista de deseos

---

## Plan

### Frontend (lógica principal, sin backend en esta feature)
- Estado global de carrito con Zustand: `{ items: [{productId, quantity, unitPrice, name, image}] }`
- Persistencia en `localStorage` (clave `troncodrilo_cart`)
- Hook `useCart` con acciones: `addItem`, `updateQuantity`, `removeItem`, `clearCart`, `getSubtotal`
- Validación de stock contra el dato más reciente del producto (refetch antes de checkout)

### Backend
- No requiere persistencia de carrito en MVP (el carrito vive en frontend hasta el checkout)
- El backend solo valida stock y precio en el momento de crear el pedido (feature 004)

### Dependencia
Requiere `002-catalogo-productos` completa (necesita datos reales de producto y stock).

---

### Layout base (prerequisito del carrito)
0. [x] Crear componente `Layout.tsx` con Header + Main + Footer que envuelva todas las páginas
1. [x] Header sticky con: logo, nav principal (Tienda, Artistas, Bola Troncodrilo), icono carrito con contador, botones login/register (si no hay sesión), nombre usuario + cerrar sesión (si hay sesión), enlace panel admin (si role=admin)
2. [x] Footer simple con links y créditos
3. [x] Página Home (`/`) con hero section y acceso rápido a Tienda y Bola Troncodrilo
4. [x] Aplicar Layout a todas las rutas existentes en App.tsx

## Tasks

1. [x] Frontend: instalar Zustand
2. [x] Frontend: store `useCart` con persistencia en localStorage
3. [x] Frontend: componente `CartDrawer` o página `/carrito`
4. [x] Frontend: botón "Añadir al carrito" en `ProductCard` y ficha de producto
5. [x] Frontend: control de cantidad con límite de stock
6. [x] Frontend: cálculo de subtotal reactivo
7. [x] Verificar los 7 criterios de aceptación
