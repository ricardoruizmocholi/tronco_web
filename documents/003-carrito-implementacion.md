# 003 — Carrito de Compra: Decisiones de Implementación

## Arquitectura del estado

### Zustand en lugar de Context API
El carrito usa Zustand (`zustand` v5) en vez de Context API porque necesita:
- Persistencia en `localStorage` sin boilerplate (middleware `persist` integrado)
- Acceso al estado desde cualquier componente sin prop-drilling ni proveedor adicional
- Funciones computadas (`getTotalItems`, `getSubtotal`) que leen el estado interno via `get()`

El store vive en `src/store/cartStore.ts` y se expone como hook en `src/hooks/useCart.ts`.

### `partialize` — solo `items` se persiste
`isOpen` se excluye de `localStorage` con `partialize: (state) => ({ items: state.items })`.
El drawer siempre arranca cerrado aunque el usuario recargue la página. Persistir `isOpen` causaría que el drawer se abriera solo al cargar, lo cual es confuso.

### `CartItem` incluye `stock` y `categorySlug`
- `stock` se guarda junto al item para poder deshabilitar el botón `+` en el drawer sin un fetch adicional. Limitación conocida: si el stock cambia en el servidor tras añadir al carrito, el valor local queda desactualizado hasta recargar la ficha. Se acepta para MVP; se resolverá con un refetch en el checkout (Feature 004).
- `categorySlug` permite al drawer consultar `GET /api/products?category=slug` para las recomendaciones sin necesitar un campo extra en el backend.

### `addItem` abre el drawer automáticamente
Toda llamada a `addItem` establece `isOpen: true`. Decisión de UX: el usuario ve inmediatamente el resultado de su acción. El drawer se puede cerrar con ESC (overlay click) o con "Seguir comprando".

### `updateQuantity(id, 0)` delega en `removeItem`
Un único camino de eliminación evita inconsistencias. Si la cantidad llega a 0 (por el botón `−`), se llama a `removeItem` internamente.

## Drawer lateral (CartDrawer)

### CSS transform en vez de condicional en el DOM
El drawer siempre está en el DOM (`translate-x-full` cuando cerrado, `translate-x-0` cuando abierto). Esto permite la animación de deslizamiento. Una implementación con `{isOpen && <CartDrawer />}` no podría animar la salida porque el elemento desaparece del DOM antes de que termine la transición.

### Scroll del body bloqueado con `useEffect`
```tsx
useEffect(() => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  return () => { document.body.style.overflow = '' }
}, [isOpen])
```
Evita que el usuario pueda hacer scroll en la página de fondo mientras el drawer está abierto.

### Recomendaciones: fetch al abrir, no al añadir
Las recomendaciones se cargan cuando `isOpen` cambia a `true`, no en cada `addItem`. Esto evita un fetch por cada producto añadido. La categoría usada es la del primer item con `categorySlug` definido.

## Layout base

### `/login` y `/register` fuera del Layout
`App.tsx` define dos grupos de rutas:
1. Sin Layout: `<Route path="/login">`, `<Route path="/register">` — pantalla completa para auth.
2. Con Layout: `<Route element={<Layout />}>` — todas las demás rutas, incluidas las protegidas.

`ProtectedRoute` y `AdminRoute` (que también usan `<Outlet />`) se anidan dentro del grupo con Layout sin conflicto.

### Badge del carrito: `9+` para cantidades grandes
El badge muestra el número exacto hasta 9; a partir de 10 muestra `9+` para no desbordar el círculo. El color cambia de `bg-white/20` (vacío) a `bg-primary` (con items).

### Logout del header idéntico al de AuthContext
El handler en `Layout` es `try { await logout() } finally { navigate('/login') }` — mismo patrón que el bug corregido en Feature 001.

## Bugs corregidos

### Bug crítico: Rules of Hooks en ProductPage

**Síntoma:** Al navegar a `ProductPage` desde una recomendación del drawer, React lanzaba "Rendered more hooks than during the previous render".

**Causa raíz:** `useCartStore(s => s.addItem)` estaba declarado en la línea 48 de `ProductPage.tsx`, **después** de dos early returns condicionales:
```tsx
if (loading) return (...)           // línea 29 — salida sin llamar al hook
if (notFound || !product) return (...)  // línea 37

const addItem = useCartStore(...)   // línea 48 — hook DESPUÉS de return
```
En el primer render `loading = true`, el componente salía antes de llamar a `useCartStore`. En renders posteriores (loading = false, producto cargado), el hook sí se ejecutaba. React detecta que el número de hooks cambia entre renders y lanza el error.

**Fix:** Mover `useCartStore(s => s.addItem)` al inicio del componente, antes de cualquier `return` condicional, junto con el resto de hooks (`useState`, `useEffect`).

**Lección:** Todo hook debe llamarse incondicionalmente en el nivel raíz del componente, sin importar si su valor se usa o no en ese render.

### Bug menor: `addItem` no disponible en recomendaciones del CartDrawer

**Síntoma:** Los productos de la sección "También te puede gustar" no tenían botón de añadir al carrito.

**Causa:** `addItem` no estaba incluido en el destructuring de `useCartStore()` en `CartDrawer`. Las recomendaciones eran solo `<Link>` sin acción de compra.

**Fix:**
1. Añadir `addItem` al destructuring del store.
2. Reestructurar cada recomendación de `<Link>` a `<div>` con tres elementos independientes: miniatura clicable, nombre clicable y botón `+ Añadir`. Un `<button>` dentro de un `<a>` es HTML inválido, de ahí la necesidad de separar los elementos.

## Mejoras futuras (anotadas)
- Refetch de stock antes del checkout para detectar cambios en el servidor (Feature 004).
- Animación de "añadido" (breve feedback visual en el badge o el botón) para mayor claridad.
- Cerrar drawer con tecla Escape (`useEffect` con `keydown` listener).
- Recomendaciones multi-categoría si el carrito tiene items de categorías distintas.
