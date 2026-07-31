# 017 — Rediseño estético global (inspiración Nude Project)

## Resumen

Redefine la identidad visual de toda la tienda **excepto `/bola-troncodrilo`** (estética
espacial propia, intacta), adoptando el lenguaje de nude-project.com: tipografía editorial,
espaciado generoso, cards de producto minimalistas, sin sombras ni gradientes, radios de
esquina casi nulos. La paleta de color de Troncodrilo (`#5BBB2A` primario, `#8B4A2A`
secundario, `#FAFAF8` canvas, `#1A1A1A` ink, `#1C1F1A` dark) **no cambia** — es un cambio de
forma, no de color. **100% frontend, cero cambios en backend.**

---

## Tipografía elegida

**Instrument Serif** (Google Fonts), aplicada como `.font-editorial` sobre la sans-serif
existente para body/labels/precios.

Se propusieron 3 opciones (Domine, Fraunces, Instrument Serif) mediante un specimen visual
comparativo antes de escribir ningún código (paso 0, bloqueante). Instrument Serif se eligió
por:
- Look editorial de alto contraste sin resultar "revista de moda" pesada — encaja con el
  tono desenfadado pero cuidado de la marca (Troncodrilo es un personaje ilustrado, no un
  producto de lujo serio).
- Un único peso/estilo (regular + itálica) reduce la superficie de mantenimiento frente a
  familias con muchos pesos como Fraunces.
- Buen contraste de legibilidad a los tamaños grandes usados en `h1`/nombres de producto sin
  necesitar tracking negativo agresivo.

```css
.font-editorial { font-family: 'Instrument Serif', serif; }
```

Uso: títulos hero, nombre de producto en `ProductCard`/`ProductPage`, headings de sección
(`ArtistsPage`, `ArtistProfilePage`, `ProfilePage`, páginas de checkout). El cuerpo, labels,
precios y navegación mantienen la sans-serif del sistema existente.

---

## Sistema de utilidades (`index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
@import "tailwindcss";
@source "./**/*.{ts,tsx,html}";
```

> **Nota de orden crítico**: el `@import` de Google Fonts debe preceder a
> `@import "tailwindcss"`, porque Tailwind expande su import in-place en CSS real; si va
> después, Vite lanza `[vite:css] @import must precede all other statements`.

Clases nuevas:

| Clase | Uso |
|---|---|
| `.font-editorial` | Serif editorial (Instrument Serif) |
| `.label-caps` | `text-xs tracking-widest uppercase` — labels, categorías, eyebrows |
| `.btn-primary` | Botón sólido primario (fondo `primary`, uppercase, `border-radius: 2px`) |
| `.btn-secondary` | Botón outline (borde `ink`, invierte a fondo `ink` en hover) |
| `* { box-shadow: none !important }` | Elimina sombras en toda la app de una sola vez |

Los tokens de color (`--color-primary`, `--color-secondary`, `--color-canvas`, `--color-ink`,
`--color-dark`) se mantienen sin cambios — solo se re-declaran explícitamente en `@theme`.

---

## Decisiones de diseño

**Concepto de card "punto → expansión"** (sustituye el crossfade a segunda imagen y el
overlay "QUICK ADD" descritos en el borrador original de la spec): en reposo la imagen está
a `scale(0.85)` con un overlay claro sutil (`rgba(250,250,248,0.15)`) y un punto central de
8px; al hover (`group-hover`, CSS puro, sin JS) la imagen se expande a `scale(1)`, el overlay
claro y el punto desaparecen, y aparece un overlay oscuro sutil (`rgba(0,0,0,0.15)`) con el
texto "VER PRODUCTO" centrado. Transición 300ms ease. El quick-add ("+ Añadir") se mantiene
bajo la imagen para productos sin variantes, no como overlay sobre la imagen.

**Excepción semántica del círculo**: la regla "sin border-radius > 2px" no aplica a formas
intencionalmente circulares — avatares, swatches de color (`ColorSwatch`), puntos de
paginación de carrusel, el punto central del concepto punto→expansión, badges de
notificación circulares. Un círculo es una forma elegida, no una esquina de UI redondeada;
es el mismo criterio que aplican COS o Zara en sus interfaces. Decisión validada
explícitamente con el usuario antes de aplicarla de forma consistente en todos los archivos.

**Wordmark de texto en vez de logo de imagen**: se inspeccionó el archivo real
`logo_troncodrilo.PNG` (2048×2048, ilustración a mano del personaje cocodrilo/tronco, sin
texto embebido) antes de decidir. Se descartó como logo de header por dos motivos: (1) no
escala con legibilidad a la altura reducida del nuevo header (48px móvil / 56px escritorio),
y (2) el trazo ilustrado no encaja con la dirección editorial disciplinada del resto de la
interfaz. Se mantiene el wordmark de texto `TRONCODRILO` en `.font-editorial` en el header
(`Layout.tsx`) y en el drawer de navegación móvil (`MobileDrawer.tsx`, alineado por
consistencia aunque no estaba en la lista original de archivos). El logo original de imagen
permanece en el footer, sin tocar.

**Eliminación de gradientes**: se retiraron los `bg-gradient-to-t` de las cards "Acceso
rápido" de `HomePage` y del overlay de caption en la galería de `ArtistProfilePage` — en
ambos casos eran puramente decorativos (sin imagen de fondo real debajo, o sustituibles por
un overlay plano sin pérdida de legibilidad).

**Precio discreto**: por instrucción explícita durante la implementación, el precio en
`ProductCard` y `ProductPage` usa `text-sm`, más pequeño que el "tamaño medio" del borrador
original de la spec — mantiene la jerarquía visual centrada en el nombre/imagen del
producto, no en el precio.

**Padding de grid ajustado**: `StorePage` usa `px-4 md:px-8 lg:px-16`, valores afinados en
sesión respecto al borrador original de la spec.

**Alcance de la limpieza global (Tarea 8)**: además de los archivos listados explícitamente
en la spec (`Layout.tsx`, `ProductCard.tsx`, `StorePage.tsx`, `HomePage.tsx`,
`CarouselSection.tsx`, `ProductPage.tsx`, `AttributeSelector.tsx`, `ArtistsPage.tsx`,
`ArtistProfilePage.tsx`, `CartDrawer.tsx`, `ProfilePage.tsx`, páginas de checkout), se
incluyeron `MobileDrawer.tsx`, `ShippingAddressModal.tsx`, `OrdersPage.tsx` y
`ProfileOrdersSection.tsx` por ser componentes cliente directamente vinculados a los mismos
flujos ya rediseñados (nav móvil, checkout, listado de pedidos) — dejarlos con
`rounded-xl`/`rounded-2xl` habría creado una inconsistencia visual inmediata al navegar. El
**panel admin queda fuera de este rediseño** (solo mejoras menores de consistencia, no
rediseño completo, según el alcance original de la spec) y no se tocó ningún archivo bajo
`pages/admin/` ni `components/admin/` salvo el picker visual de imágenes de variante ya
existente de la feature 015.

---

## Antes / después (descripción textual — sin capturas, entorno sin navegador)

- **Header**: pasa de `h-16` con fondo `bg-dark` semitransparente y logo de imagen, a
  `h-12 md:h-14` con fondo `bg-canvas` sólido y wordmark de texto en serif. Nav centrada con
  subrayado animado en hover (`after:` pseudo-elemento) en vez de estado activo por color.
- **Cards de producto**: de imagen estática + botón "Añadir" superpuesto, a la metáfora
  punto→expansión (imagen "respira" en hover, sin JS). Nombre en serif, precio discreto.
- **Grid de tienda**: pasa de 2/3 columnas con padding ajustado a 2/3/4 columnas con padding
  lateral generoso y chips de categoría planos (antes píldoras `rounded-full`).
- **Ficha de producto**: precio pasa de `text-3xl font-bold` a `text-sm font-medium`;
  descripción pasa de texto siempre visible a acordeón colapsable CSS-only
  (`grid-template-rows` 0fr↔1fr); botones de talla pasan de relleno a borde en estado
  seleccionado.
- **Global**: cero sombras, cero gradientes decorativos, radios de esquina reducidos a 2px o
  eliminados en botones/cards/inputs (con la excepción semántica del círculo).

---

## Guía para futuras features

- Usar siempre `.btn-primary`/`.btn-secondary` para CTAs — no repetir clases de Tailwind
  sueltas para botones.
- Usar `.label-caps` para cualquier eyebrow/etiqueta/categoría en mayúsculas.
- Usar `.font-editorial` solo en headings y nombres de producto — nunca en cuerpo de texto
  largo (Instrument Serif no está pensada para párrafos).
- Nuevos elementos circulares (avatares, badges, dots) están exentos de la regla de
  `border-radius`; nuevos elementos rectangulares (cards, botones, inputs, modales) deben
  usar `rounded-none` o como mucho 2px explícitos — nunca `rounded-lg`/`rounded-xl`/etc.
- No añadir `box-shadow` a componentes nuevos — la regla global `* { box-shadow: none
  !important }` en `index.css` lo neutraliza igualmente, así que añadirlo es código muerto.
- El panel admin no sigue este sistema todavía — si se rediseña en el futuro, tratarlo como
  una feature propia con su propia revisión de alcance.
- `/bola-troncodrilo` mantiene su propia identidad visual espacial y debe seguir excluida de
  cualquier barrido de estilos global.

---

## Verificación de cierre

- `php artisan test`: 19 fallos preexistentes / 43 pasan (111 assertions) — idéntico al
  baseline conocido de la feature 015. Sin regresiones, coherente con que esta feature es
  100% frontend.
- Typecheck (`npx tsc -b`) tras cada tarea: mismos ~17-18 errores preexistentes en archivos no
  tocados por esta feature (`ProfileOrdersSection.tsx`, `StarField.tsx`,
  `ArtistProfilePage.tsx` namespace JSX, `OrdersPage.tsx`/`AdminOrdersPage.tsx`
  `Record<OrderStatus>`, `ProductPage.tsx` "possibly null"), ninguno nuevo.
- Verificado explícitamente: ningún archivo bajo `/bola-troncodrilo` (`BolaTroncodriloPage.tsx`,
  `StarField.tsx`) aparece en el diff de esta feature.
