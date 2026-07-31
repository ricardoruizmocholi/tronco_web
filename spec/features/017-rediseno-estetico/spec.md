# 017 — Rediseño estético global (inspiración Nude Project)

## Spec

### Qué hace
Redefine la identidad visual de toda la tienda (excepto `/bola-troncodrilo`)
adoptando la estética de Nude Project: tipografía editorial, layout generoso,
navegación limpia, cards de producto minimalistas con interacciones sutiles.
La paleta de color de Troncodrilo se mantiene — cambia la forma, no el color.

### Referencia visual
**nude-project.com** — características clave a adoptar:
- Tipografía serif editorial en títulos, sans-serif en cuerpo
- Espaciado extremadamente generoso — el aire es parte del diseño
- Header ultra-limpio: logo centrado o izquierda, nav minimalista, iconos derecha
- Cards de producto: imagen grande, hover que muestra segunda imagen (si existe),
  talla disponible con QUICK ADD directo sin entrar a la ficha
- Grid de productos: 2 columnas móvil, 3-4 columnas desktop con padding lateral amplio
- Botones: sin border-radius o border-radius mínimo, uppercase, tracking amplio
- Precios: tipografía pequeña, discreta, bajo el nombre
- Sección hero: imagen a sangre, texto superpuesto con mezcla serif/sans

### Páginas afectadas (todas excepto /bola-troncodrilo)
- Layout.tsx (header + nav global)
- HomePage.tsx
- StorePage.tsx + ProductCard.tsx
- ProductPage.tsx
- ArtistsPage.tsx + ArtistProfilePage.tsx
- ProfilePage.tsx (ya rediseñada en 010 — revisar consistencia)
- Páginas de checkout (success/cancel)
- Panel admin (mejoras menores de consistencia — no rediseño completo)

### Criterios de aceptación

**Tipografía**
- [x] Título principal (h1, hero): serif editorial — Instrument Serif (Google Fonts),
  confirmada con el usuario antes de implementar (specimen visual comparativo)
- [x] Cuerpo, labels, precios: sans-serif existente
- [x] Letras en uppercase con `tracking-widest` en labels, categorías y CTAs

**Header / navegación**
- [x] Logo a la izquierda, links de nav centrados, iconos (carrito, perfil) a la derecha
- [x] Nav links en uppercase tracking-wide, sin subrayado, hover con línea inferior animada
- [x] Header con fondo blanco/canvas sólido — sin transparencias
- [x] Altura del header reducida — más compacto que el actual (48px móvil / 56px escritorio)

**Cards de producto**
- [x] Imagen ocupa el 100% del ancho de la card, ratio 3:4 (portrait)
- [x] **Concepto revisado en la sesión de implementación** (sustituye el crossfade a
  segunda imagen y el QUICK ADD descritos originalmente): metáfora punto → expansión.
  En reposo la imagen está a `scale(0.85)` con un overlay claro sutil y un punto central
  de 8px; al hover se expande a `scale(1)`, el overlay claro y el punto desaparecen, y
  aparece un overlay oscuro sutil con el texto "VER PRODUCTO" centrado. CSS puro
  (`group-hover`), sin JavaScript.
- [x] Bajo la imagen: nombre del producto en `font-editorial`, precio discreto (`text-sm`)
- [x] Swatches de color si hay atributo color (conectado con feature 015)
- [x] El quick-add original ("+ Añadir") se mantiene bajo la imagen para productos sin
  variantes — no como overlay sobre la imagen, que ahora es exclusivamente el "VER PRODUCTO"
- [x] Sin sombras en cards — solo borde `border-ink/10`, nunca box-shadow

**Grid de productos (StorePage)**
- [x] 2 columnas en móvil, 3 columnas en tablet, 4 columnas en desktop
- [x] Padding lateral generoso — `px-4 md:px-8 lg:px-16` (valores ajustados en la sesión
  respecto al borrador original de la spec, siguiendo la instrucción explícita del chat)
- [x] Sin bordes de grid — las cards flotan en el espacio (solo hairline propio de cada card)

**Ficha de producto (ProductPage)**
- [x] Layout 50/50 desktop: imagen izquierda (galería vertical), info derecha; imagen
  arriba / info abajo en móvil (orden natural del grid de una columna)
- [x] Nombre del producto: tipografía grande, serif (`font-editorial`)
- [x] Precio: `text-sm` — más discreto que "tamaño medio" del borrador original,
  siguiendo la instrucción explícita del chat ("Precio: text-sm")
- [x] Selectores de atributos: misma línea por atributo, etiqueta `label-caps`; botones
  de talla con borde `#1A1A1A` cuando están seleccionados (no relleno)
- [x] Botón "AÑADIR AL CARRITO": ancho completo, uppercase, sin border-radius (`.btn-primary`)
- [x] Descripción del producto colapsable con acordeón minimalista (chevron SVG,
  `grid-template-rows` para la transición, sin animaciones exageradas)

**HomePage**
- [x] Hero: imagen a sangre (100vw × 70vh), texto superpuesto centrado con serif
- [x] Sección carrusel de ofertas/novedades (feature 016): consistente con nuevo diseño
  (label-caps, línea separadora, pestañas ya sin píldoras desde su implementación original)
- [x] Sección colaboradores: grid de logos en escala de grises, color al hover

**Estética global**
- [x] Sin gradientes (verificado en todos los archivos tocados fuera del panel admin)
- [x] Sin sombras (`box-shadow: none !important` global en `index.css`, verificado)
- [x] Sin border-radius mayor a 2px en elementos de UI (botones, cards, inputs) — excepción
  semántica para círculos intencionales (avatares, swatches de color, puntos de paginación,
  el punto central del concepto punto→expansión), aprobada explícitamente por el usuario
- [x] Transiciones: 200-300ms ease en hover de imágenes, 150ms en botones
- [x] Fondo general: #FAFAF8 (sin cambios)
- [x] Texto principal: #1A1A1A (sin cambios)

**Páginas secundarias**
- [x] ArtistsPage: cards sin `rounded-2xl`/sombra, borde `border-ink/10` con hover `border-primary/40`,
  nombre en `font-editorial`
- [x] ArtistProfilePage: hero a sangre con overlay plano (sin gradiente), galería/lightbox sin
  radios grandes, secciones con `label-caps`
- [x] CartDrawer: miniaturas y controles sin radios grandes, botones de acción usando
  `.btn-primary`/`.btn-secondary`
- [x] ProfilePage: headings de sección en `font-editorial` (resto ya alineado desde la feature 010,
  sin cambios estructurales — según instrucción explícita del chat)

### Fuera de alcance
- /bola-troncodrilo (se mantiene igual — estética espacial propia)
- Panel admin (solo ajustes menores de consistencia, no rediseño)
- Animaciones de scroll o parallax en la landing (post-MVP)

---

## Plan

### Approach
Esta feature es **solo frontend** — cero cambios en backend.
El orden de implementación es de afuera hacia adentro:
1. Sistema de diseño (variables, tipografía) → 2. Layout global → 3. Cards →
4. Páginas de tienda → 5. Ficha de producto → 6. Resto de páginas

### Skills requeridas
Antes de escribir cualquier código, Claude Code debe leer:
- `ui-ux-pro-max` (find /mnt/skills -name "*.md" | sort)
- `impeccable`
- `frontend-design` (/mnt/skills/public/frontend-design/SKILL.md)

### Archivos a modificar
- `src/frontend/src/index.css`: añadir fuente serif, variables de diseño
- `src/frontend/src/components/Layout.tsx`: nuevo header
- `src/frontend/src/components/ProductCard.tsx`: rediseño completo
- `src/frontend/src/pages/HomePage.tsx`: hero a sangre + secciones
- `src/frontend/src/pages/StorePage.tsx`: nuevo grid
- `src/frontend/src/pages/ProductPage.tsx`: layout 50/50
- `src/frontend/src/pages/ArtistsPage.tsx`
- `src/frontend/src/pages/ArtistProfilePage.tsx`
- `src/frontend/src/components/CartDrawer.tsx`: consistencia visual

### Nuevos componentes
- `QuickAddButton.tsx`: botón de añadir rápido que aparece en hover de card

### Dependencias
- Puede desarrollarse antes de 015 y 016, pero debe revisarse tras ellas
  para garantizar consistencia con swatches y precios promocionales

---

## Tasks

1. [x] Proponer fuente serif (Google Fonts) y esperar OK antes de implementar
2. [x] Añadir fuente serif a index.css + variables de diseño globales
3. [x] Rediseñar Layout.tsx: header compacto, nav centrada, iconos derecha
4. [x] Rediseñar ProductCard.tsx: ratio 3:4, concepto punto→expansión en hover (revisado
   en sesión — sustituye crossfade/QUICK ADD, ver criterios de aceptación arriba)
5. [x] `QuickAddButton.tsx` — **no aplica**: el concepto final no usa un botón flotante
   sobre la imagen (esa área es solo "VER PRODUCTO"); el quick-add existente se mantiene
   inline bajo la imagen, sin necesitar un componente nuevo
6. [x] Rediseñar StorePage.tsx: grid 2/3/4 columnas, padding generoso, chips de categoría planos
7. [x] Rediseñar HomePage.tsx: hero a sangre 70vh, serif en títulos, sin gradientes
   (se eliminaron los `bg-gradient-to-t` de "Acceso rápido", eran puramente decorativos)
8. [x] Rediseñar ProductPage.tsx: layout 50/50, acordeón descripción, AttributeSelector.tsx
   con borde en vez de relleno en el estado seleccionado
9. [x] Rediseñar ArtistsPage.tsx
10. [x] Rediseñar ArtistProfilePage.tsx
11. [x] Revisar CartDrawer.tsx: consistencia visual
12. [x] Revisar ProfilePage.tsx: consistencia con nuevo sistema
13. [x] Revisar páginas checkout success/cancel
14. [x] Revisión global: sin sombras, sin gradientes, sin border-radius > 2px — incluyó además
   `MobileDrawer.tsx`, `ShippingAddressModal.tsx`, `OrdersPage.tsx` y `ProfileOrdersSection.tsx`,
   no listados originalmente en "Archivos a modificar" pero parte de los mismos flujos cliente
   (nav móvil, checkout, pedidos) ya rediseñados — decisión de scope explicada en la
   documentación de cierre
15. [x] Verificación en móvil (320px), tablet (768px) y desktop (1440px) — revisión a nivel de
   código (clases responsive `sm:`/`md:`/`lg:` en cada componente tocado); no se dispone de
   navegador para capturas en este entorno, según se indicó de forma transparente
16. [x] php artisan test — 19 fallos preexistentes / 43 pasan (111 assertions), idéntico al
   baseline conocido de la feature 015 — sin regresiones, coherente con que esta feature es
   100% frontend
17. [x] git commit + push
