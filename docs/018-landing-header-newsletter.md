# 018 — Landing rediseño + header dinámico + newsletter

## Resumen

Rediseña la home pública con un hero de altura completa gestionable desde admin (imagen o
vídeo, con rotación automática), una sección de producto con tarjetas propias de la landing
(`LandingProductCard.tsx`), una sección partida artistas/bola-troncodrilo, y una sección de
newsletter con footer nuevo de 3 columnas. El header pasa a ser dinámico: transparente al
cargar y al bajar, sólido al subir. Se añade un sistema de "hero slides" en admin y un sistema
de newsletter (suscripción pública + panel admin con export CSV). **100% frontend + backend
aditivo — cero cambios en modelos/tablas existentes.** `/bola-troncodrilo` y `ProductCard.tsx`
(tienda) no se han tocado en ningún momento.

```
HeroSlide (image|video, título/subtítulo/CTA opcionales, is_active, position)
NewsletterSubscriber (email único, name, confirmed_at, ip_address)
```

---

## Archivos creados

**Backend**

| Archivo | Descripción |
|---|---|
| `database/migrations/2026_08_01_090000_create_hero_slides_table.php` | Tabla `hero_slides` |
| `database/migrations/2026_08_01_090001_create_newsletter_subscribers_table.php` | Tabla `newsletter_subscribers` |
| `app/Models/HeroSlide.php` | `scopeActive()`, casts `is_active`/`position` |
| `app/Models/NewsletterSubscriber.php` | Cast `confirmed_at` a datetime |
| `app/Http/Controllers/AdminHeroController.php` | CRUD + `reorder()` (acepta `[{id, position}]`) |
| `app/Http/Controllers/HeroSlideController.php` | `publicIndex()` — solo activos, ordenados |
| `app/Http/Controllers/NewsletterController.php` | `subscribe()` — 201 / 422 "Ya estás suscrito." |
| `app/Http/Controllers/AdminNewsletterController.php` | Listado paginado + `export()` (CSV vía `streamDownload`+`fputcsv`) |

**Frontend**

| Archivo | Descripción |
|---|---|
| `src/hooks/useHeaderState.ts` | Estado `transparent`/`solid` según posición y dirección de scroll |
| `src/types/heroSlide.ts`, `src/api/heroSlides.ts` | Tipos y API pública + admin de hero slides |
| `src/types/newsletter.ts`, `src/api/newsletter.ts` | Tipos y API de newsletter (subscribe, listado, export) |
| `src/components/LandingProductCard.tsx` | Card de producto específica de la landing (no toca `ProductCard.tsx`) |
| `src/components/Footer.tsx` | Footer de 3 columnas (logo, navegación, información) |
| `src/pages/policies/PolicyPlaceholderPage.tsx` | Placeholder genérico (título + "Contenido próximamente"), reutilizado en 4 rutas |
| `src/pages/admin/AdminHeroPage.tsx` | CRUD de hero slides + drag & drop HTML5 nativo para reordenar |
| `src/pages/admin/AdminNewsletterPage.tsx` | Tabla paginada de subscribers + export CSV |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `routes/api.php` | Rutas públicas (`/hero-slides`, `/newsletter/subscribe`) y admin (`/admin/hero-slides*`, `/admin/newsletter/*`) |
| `src/components/Layout.tsx` | Header dinámico: swap de logo (`Troncodrilo_cabeceza_blanco.png` ↔ `Troncomundo_cabecera.png`), colores nav/iconos, sin spacer fijo; monta `<Footer />` |
| `src/pages/HomePage.tsx` | Reescritura completa: hero 100vh, `ProductsSection`, `ArtistsBolaSplitSection`, sección Colaboradores (sin cambios), `NewsletterSection` |
| `src/pages/admin/AdminDashboardPage.tsx` | Cards "Hero Slides" y "Newsletter" |
| `src/App.tsx` | Rutas `/admin/hero`, `/admin/newsletter` y 4 rutas de políticas placeholder |

---

## Decisiones técnicas

**Header transparente en todas las páginas, no solo en la home.** El logo/nav en estado
transparente usa `#FAFAF8` (casi blanco), que sobre el fondo `bg-canvas` (mismo tono) de la
mayoría de páginas del sitio (tienda, perfil, admin, checkout...) resulta poco legible hasta
que el usuario hace scroll y el header se vuelve sólido. Se planteó esta duda explícitamente
al usuario antes de implementar, ofreciendo limitar el comportamiento dinámico solo a la
home; se confirmó implementarlo literalmente tal como describe la spec, en todas las
páginas, aceptando ese contraste reducido en la carga inicial de páginas sin hero oscuro.

**Contenido de cada hero slide no se renderiza en la home.** El modelo `HeroSlide` guarda
`title`/`subtitle`/`cta_text`/`cta_url` (gestionables desde `AdminHeroPage.tsx`), pero el
texto superpuesto sobre el hero es fijo ("Bienvenido a la Troco Tienda" / "Visita la
tienda" → `/tienda`), tal como especifica la tarea 3 de forma literal. Esos campos quedan
como metadatos gestionables para un uso futuro no cubierto por esta feature.

**`LandingProductCard.tsx` como componente independiente.** La ficha de producto de la
landing tiene una estructura muy distinta a `ProductCard.tsx` (80/20 imagen/info dentro de
un contenedor de ratio fijo, favoritos, navegación entre imágenes con flechas) — crear un
componente separado evita romper la card de la tienda y mantiene cada una con su propio
ciclo de vida.

**Favoritos en `localStorage`, sin tabla nueva.** Se guarda un array de IDs de producto bajo
la clave `troncodrilo_favorites`. Sin sesión, el clic en el corazón abre un modal que usa el
`AuthContext` existente para ofrecer "Iniciar sesión" / "Registrarse" — no se ha creado
ningún sistema de auth nuevo.

**Textura de estrellas CSS pura, no reutiliza `StarField.tsx`.** No existe ninguna imagen
estática de la bola-troncodrilo en el proyecto, así que la mitad derecha de la sección
partida usa siempre el fallback: ~70 puntos posicionados una única vez con `useMemo`
(`Math.random()` calculado al montar, sin canvas ni animación), deliberadamente distinto del
componente `StarField.tsx` (canvas animado) que pertenece en exclusiva a `/bola-troncodrilo`.

**Overlay hover con dos capas apiladas.** Para pasar de `rgba(0,0,0,0.4)` en reposo a
`rgba(0,0,0,0.2)` en hover sin animar un color arbitrario (Tailwind no soporta transicionar
`style={{backgroundColor}}` vía `group-hover`), se apilan dos capas de `rgba(0,0,0,0.2)`; la
superior se desvanece a `opacity-0` en hover, dejando solo la base. Mismo patrón que ya usa
`ProductCard.tsx` para su overlay de colapso.

**Alcance ampliado en la limpieza (tarea 8).** Los tipos y la API de hero slides
(`types/heroSlide.ts`, `api/heroSlides.ts`) se crearon ya en la tarea 3, no en la 8 como
agrupaba el borrador original de la spec — eran un prerequisito técnico para construir la
sección hero. La tarea 8 se dedicó a la verificación de alcance en su lugar (diff limpio de
`ProductCard.tsx` y `/bola-troncodrilo`, revisión de breakpoints responsive).

---

## Verificación de cierre

- `php artisan test`: 19 fallos preexistentes / 43 pasan (111 assertions) — idéntico al
  baseline conocido. Sin regresiones, coherente con que el backend de esta feature es
  puramente aditivo (dos tablas nuevas, sin tocar modelos/controladores existentes).
- Typecheck (`npx tsc -b`) tras cada tarea: mismos ~17-18 errores preexistentes en archivos
  no tocados por esta feature, ninguno nuevo.
- `git status` confirma que `ProductCard.tsx`, `BolaTroncodriloPage.tsx` y `StarField.tsx`
  no aparecen en el diff de esta feature.
- Prueba end-to-end manual (curl) del flujo de duplicado de newsletter: el 422 devuelve
  "Ya estás suscrito." tanto en `message` como en `errors.email[0]`.
