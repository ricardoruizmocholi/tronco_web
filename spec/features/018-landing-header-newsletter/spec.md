# 018 — Landing rediseño + header dinámico + newsletter

## Spec

### Qué hace
Rediseña la home pública (`HomePage.tsx`) con un hero de altura completa (imagen/vídeo
gestionable desde admin), una sección de producto con tarjetas propias de la landing, una
sección partida artistas/bola-troncodrilo, y una sección de newsletter con footer nuevo.
El header pasa a ser dinámico: transparente al cargar y al hacer scroll hacia abajo, sólido
al hacer scroll hacia arriba. Se añade un sistema de gestión de "hero slides" en admin
(sustituye conceptualmente a los banners para la portada) y un sistema de newsletter
(suscripción pública + panel admin con export CSV). `/bola-troncodrilo` no se toca.

### Páginas/componentes afectados
- Backend: nuevas tablas `hero_slides`, `newsletter_subscribers`; controladores
  `AdminHeroController`, `NewsletterController`, `AdminNewsletterController`
- `Layout.tsx` — header dinámico transparente/sólido
- `HomePage.tsx` — reescritura completa (hero, productos, artistas/bola, newsletter)
- `LandingProductCard.tsx` (nuevo) — card de producto específica de la landing
- `Footer.tsx` (nuevo) — footer de 3 columnas, sustituye al footer inline de `Layout.tsx`
- Páginas placeholder de políticas (4 rutas nuevas)
- `AdminHeroPage.tsx`, `AdminNewsletterPage.tsx` (nuevos) + tarjetas en `AdminDashboardPage.tsx`
- `App.tsx` — nuevas rutas

### Fuera de alcance
- `/bola-troncodrilo` y sus componentes (`BolaTroncodriloPage.tsx`, `StarField.tsx`) — no se
  tocan en ningún momento
- `ProductCard.tsx` (tienda) — no se toca; la landing usa `LandingProductCard.tsx` separada
- Contenido real de las páginas de políticas — solo placeholder
- Favoritos persistentes en BD — se implementan en `localStorage`, sin nueva tabla

---

## Criterios de aceptación

**Backend — Hero admin**
- [x] Migración `hero_slides` (type, url, title, subtitle, cta_text, cta_url, is_active, position)
- [x] Modelo `HeroSlide` con `scopeActive()` y orden por `position`
- [x] `AdminHeroController` con CRUD + reorder, protegido por middleware `admin`
- [x] Endpoint público `GET /api/hero-slides` — solo activos, ordenados

**Backend — Newsletter**
- [x] Migración `newsletter_subscribers` (email único, name, confirmed_at, ip_address)
- [x] `NewsletterController@subscribe` público — 201 al crear, 422 si el email ya existe
- [x] `AdminNewsletterController` — listado paginado + export CSV, protegido por `admin`

**Header dinámico**
- [x] Transparente al cargar cualquier página, en todas las páginas con `Layout`
- [x] Sólido al hacer scroll hacia arriba (fondo `#FAFAF8`, logo oscuro, texto/iconos `#1A1A1A`)
- [x] Transparente al hacer scroll hacia abajo (logo blanco, texto/iconos `#FAFAF8`)
- [x] Transparente de nuevo si `scrollY < 10`
- [x] Transición `transition-all duration-300` en todos los cambios de estado — implementado
  literalmente en todas las páginas (incluidas las que no tienen hero oscuro); riesgo de
  contraste conocido y aceptado explícitamente por el usuario, documentado en el cierre

**Hero (HomePage)**
- [x] `height: 100vh` exacto (no `min-height`)
- [x] Carga slides desde `GET /api/hero-slides`; soporta `image` y `video`
- [x] Rotación automática cada 5s si hay más de un slide activo
- [x] Fallback `#1C1F1A` si no hay slides
- [x] Contenido inferior-izquierda: texto "BIENVENIDO A LA TROCO TIENDA" + botón "VISITA LA TIENDA"
- [x] Sin overlay oscuro adicional sobre la imagen/vídeo — nota: el título/subtítulo/CTA propios
  de cada slide (campos del modelo, editables en admin en la Tarea 7) no se renderizan en la
  home; el texto superpuesto es fijo, tal como especifica esta tarea literalmente

**Sección productos (HomePage)**
- [x] Tabs "NOVEDADES" / "EN OFERTA" (oferta solo si hay promociones activas)
- [x] Grid 4×3 escritorio (12 productos), 2×3 móvil (6 productos) — implementado con
  `slice(0,12)` + wrapper `hidden md:block` en los índices ≥6, sin duplicar la petición
- [x] `LandingProductCard.tsx` nuevo, no reutiliza ni modifica `ProductCard.tsx`
- [x] Imagen 80% altura / info 20% altura, proporciones fijas via `aspect-[3/4]` + flex
- [x] Favorito (corazón): localStorage (`troncodrilo_favorites`) si hay sesión, modal
  login/registro si no — favorito es por producto, sin sincronía entre pestañas
- [x] Badge PREORDER si `allow_preorder && stock === 0` (a nivel de producto, según el
  literal de esta tarea — no variante por variante como en `ProductCard.tsx` de la tienda)
- [x] Hover imagen: segunda imagen (crossfade 200ms) + flechas de navegación si hay >1 imagen
- [x] Hover info: tallas disponibles sustituyen a los swatches de color (transición 150ms)

**Sección artistas/bola (HomePage)**
- [x] 50vh completo, dividido en dos mitades exactas sin gap (apiladas 40vh en móvil)
- [x] Mitad izquierda → `/artistas`, mitad derecha → `/bola-troncodrilo`
- [x] Overlay `rgba(0,0,0,0.4)` en reposo, `rgba(0,0,0,0.2)` en hover, transición 300ms —
  implementado con dos capas de 0.2 apiladas, la superior se desvanece en `group-hover`
- [x] Fallback bola: textura de estrellas CSS pura (puntos posicionados una vez con
  `useMemo`, sin canvas ni animación), sin reutilizar `StarField.tsx` — no existe imagen
  estática de la bola en el proyecto, así que este lado usa siempre el fallback

**Newsletter + footer**
- [x] Sección fondo `#1C1F1A`, formulario nombre+email, `POST /api/newsletter/subscribe`
- [x] Feedback éxito (`#5BBB2A`, vía clase `text-primary`) y error/duplicado inline —
  verificado end-to-end: el 422 de duplicado devuelve "Ya estás suscrito." tanto en
  `message` como en `errors.email[0]`, el frontend lee ambos con fallback seguro
- [x] `Footer.tsx` nuevo: 3 columnas desktop / 1 columna móvil, línea separadora, copyright
- [x] 4 rutas de políticas placeholder, navegables desde el footer

**Panel admin**
- [x] `AdminHeroPage.tsx` — listado con preview, drag & drop nativo HTML5 (draggable +
  onDragStart/onDragOver/onDrop, sin librería), modal crear/editar (imagen: subir vía
  `ImageUploadController` existente o pegar URL; vídeo: solo URL), toggle activo
- [x] `AdminNewsletterPage.tsx` — tabla paginada de subscribers + botón export CSV
- [x] Cards "Hero Slides" y "Newsletter" en `AdminDashboardPage.tsx`
- [x] Rutas `/admin/hero` y `/admin/newsletter` protegidas con `<AdminRoute>`

**Cierre**
- [x] `ProductCard.tsx` (tienda) sin cambios — verificado por `git status` (no aparece en el diff)
- [x] `/bola-troncodrilo` sin cambios — verificado por `git status` (`BolaTroncodriloPage.tsx`
  y `StarField.tsx` no aparecen en el diff); `CarouselSection.tsx`/`PromotionCarousel.tsx`
  tampoco se tocaron (quedan huérfanos sin uso, según lo acordado)
- [x] Responsive revisado en 320px / 768px / 1440px — revisión de código (breakpoints
  `sm:`/`md:`/`lg:` en cada componente tocado), sin navegador disponible en este entorno
- [x] `php artisan test` sin regresiones nuevas — 19 fallos preexistentes / 43 pasan, idéntico al baseline
- [x] `docs/018-landing-header-newsletter.md` creado
- [x] Commit + push

---

## Plan

### Approach
Backend primero (tablas + endpoints), luego header dinámico (afecta a toda la app), luego
landing sección a sección en el orden dado, luego panel admin, luego tipos/API/limpieza,
cierre al final. Reutiliza patrones ya existentes en el proyecto: `Banner`/`BannerController`
como referencia directa para `HeroSlide`/`AdminHeroController`; `AdminPreorderController@export`
(streamDownload + fputcsv) como referencia para el export CSV de newsletter; `ImageUploadController`
existente (`Storage::disk('public')`, ya usado por banners/productos) se reutiliza tal cual para
subir imágenes de hero slides — no se crea uno nuevo.

### Skills requeridas
`ui-ux-pro-max`, `impeccable`, `frontend-design` — ya cargadas en la sesión.

---

## Tasks

1. [x] Backend: migraciones + modelos + controladores hero slides y newsletter + rutas
2. [x] Header dinámico en `Layout.tsx`
3. [x] Sección hero en `HomePage.tsx`
4. [x] Sección productos (`LandingProductCard.tsx` + tabs) en `HomePage.tsx`
5. [x] Sección partida artistas/bola en `HomePage.tsx`
6. [x] Sección newsletter + `Footer.tsx` + páginas de políticas placeholder
7. [x] Panel admin: `AdminHeroPage.tsx`, `AdminNewsletterPage.tsx`, dashboard, rutas
8. [x] Tipos, API, limpieza y verificación de alcance (ProductCard, bola-troncodrilo, responsive)
9. [x] Spec, documentación, `php artisan test`, commit + push
