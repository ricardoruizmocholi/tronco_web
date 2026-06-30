# 003 — Carrito de Compra

## Spec

### Qué hace
Permite añadir, modificar cantidad y eliminar productos del carrito
antes de pasar al checkout.

### Criterios de aceptación
- [ ] Un usuario (logueado o no) puede añadir un producto al carrito
- [ ] El carrito persiste en `localStorage` para invitados
- [ ] Se puede cambiar la cantidad de un producto en el carrito, respetando el stock disponible
- [ ] Se puede eliminar un producto del carrito
- [ ] El carrito muestra subtotal correcto en tiempo real
- [ ] No se puede añadir más cantidad que el stock disponible del producto
- [ ] El carrito se vacía tras un checkout exitoso

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

## Tasks

1. [ ] Frontend: instalar Zustand
2. [ ] Frontend: store `useCart` con persistencia en localStorage
3. [ ] Frontend: componente `CartDrawer` o página `/carrito`
4. [ ] Frontend: botón "Añadir al carrito" en `ProductCard` y ficha de producto
5. [ ] Frontend: control de cantidad con límite de stock
6. [ ] Frontend: cálculo de subtotal reactivo
7. [ ] Verificar los 7 criterios de aceptación