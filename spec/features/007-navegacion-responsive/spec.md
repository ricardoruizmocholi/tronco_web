# 007 — Navegación responsive

## Spec

### Qué hace
Mejora la navegación global para que sea completamente usable en móvil:
header que se oculta al hacer scroll down y reaparece al scroll up,
menú hamburguesa con drawer lateral en pantallas pequeñas, y garantía
de que todas las páginas son accesibles en máximo 2 clicks desde home.

### Criterios de aceptación
- [ ] El header se oculta suavemente al hacer scroll hacia abajo y reaparece al hacer scroll hacia arriba
- [ ] En móvil (<768px) el header muestra logo + icono hamburguesa + icono carrito
- [ ] Al pulsar la hamburguesa se abre un drawer lateral con todos los links de navegación
- [ ] El drawer se cierra al pulsar fuera, al pulsar la X, o al navegar a otra página
- [ ] En escritorio el comportamiento del header actual no cambia
- [ ] Cualquier página de la app es accesible en máximo 2 clicks desde home
- [ ] El carrito sigue accesible desde el header en móvil
- [ ] El menú de usuario (login/logout/perfil) es accesible desde el drawer en móvil

### Fuera de alcance
- Menú mega-dropdown por categorías (post-MVP)
- Barra de búsqueda en header (feature independiente)

---

## Plan

### Frontend
- Hook `useScrollDirection` que devuelve `'up' | 'down'` basado en `window.scrollY`
- Header: clase CSS `translate-y-0` / `-translate-y-full` según dirección de scroll, con `transition-transform`
- Componente `MobileDrawer.tsx`: panel lateral que se desliza desde la izquierda con overlay
- Lógica de estado `isDrawerOpen` en el Layout o Header
- Revisar todas las rutas y confirmar accesibilidad en ≤2 clicks desde `/`

### Dependencia
Requiere `001-autenticacion` y `010-perfil-usuario` para incluir links de perfil en el drawer.

---

## Tasks

1. [ ] Hook `useScrollDirection` con umbral de 10px para evitar micro-fluctuaciones
2. [ ] Animación hide/show del header con `transition-transform duration-300`
3. [ ] Componente `MobileDrawer.tsx` con overlay y animación slide-in
4. [ ] Integrar hamburguesa en Header solo para `sm:hidden`
5. [ ] Cerrar drawer al cambiar de ruta (`useEffect` sobre `location.pathname`)
6. [ ] Auditoría de navegación: todas las páginas en ≤2 clicks desde home
7. [ ] Test manual en viewport 375px (iPhone SE) y 768px (tablet)
