# 022 — Mapa Troncodrilo

## Spec

### Qué hace
Nueva página `/mapa-troncodrilo`: mapa 2D interactivo (Leaflet + tiles oscuros de CartoDB,
100% gratuito, sin API key) que sustituye funcionalmente a `/bola-troncodrilo` (globo 3D) en la
navegación. Cada fanfic aprobado aparece como marker verde en su ciudad; markers cercanos se
agrupan automáticamente en clusters. Click en marker abre un panel lateral con el detalle; click
en cluster hace zoom (comportamiento nativo de Leaflet.markercluster) y además abre el panel con
la lista de fanfics del cluster. Un botón "Subir mi fanfic" abre un modal de subida (o de login si
el usuario no está autenticado).

`/bola-troncodrilo` **no se toca en absoluto** — sigue accesible por URL directa, solo sale del
menú de navegación.

### Resoluciones de criterio sobre el encargo original
- **React 19, no 18**: el proyecto corre React `^19.2.7`. `react-leaflet@5.0.0`,
  `@react-leaflet/core@3.0.0` y `react-leaflet-cluster@4.1.3` declaran soporte nativo para
  React 19 — instalación sin `--legacy-peer-deps`.
- **Header no será "transparente"**: `useHeaderState.ts` renderiza el header sólido en
  `scrollY < 10` (confirmado por el commit "sólido en top + sólido en hover"); una página de
  100vh sin scroll nunca sale de `scrollY = 0`, así que el header queda sólido (barra clara) sobre
  el mapa oscuro. No es un bug del sistema de header compartido — no se toca `useHeaderState.ts`.
- **`MobileDrawer.tsx` no necesita edición directa**: consume el array `navLinks` que le pasa
  `Layout.tsx`; el cambio en `Layout.tsx` ya actualiza ambos menús.
- **Click en cluster**: dispara el zoom nativo de Leaflet.markercluster (`zoomToBoundsOnClick`)
  **y además** abre el panel lateral con la lista de fanfics del cluster — ambas cosas, no una u
  otra.
- **Modal de login**: reutiliza el patrón ligero ya existente en `LandingProductCard.tsx`
  ("Inicia sesión para…" + enlaces a `/login`/`/register`) en vez de crear un componente
  compartido nuevo — no hay precedente de extracción en el código base.
- **Copy del split-hero en `HomePage.tsx`**: además del enlace, se actualiza la etiqueta/subtítulo
  para no dejar "Bola Troncodrilo" apuntando a una página de mapa 2D.

### Backend
`GET /api/fanfics` (público, cursor-paginado) ya devuelve `id, user_id, image_url, caption,
city_name, latitude, longitude, is_featured, created_at` + `author:{id,name}`. Le falta
`reviewed_at` (fecha de aprobación real, distinta de `created_at`), necesario para el panel —
se añade al `select()`.

### Criterios de aceptación

- [x] `leaflet`, `react-leaflet`, `@react-leaflet/core`, `leaflet.markercluster`,
      `react-leaflet-cluster` instalados; `@types/leaflet` como devDependency
- [x] `FanficController@publicIndex` incluye `reviewed_at`
- [ ] `/mapa-troncodrilo` carga un mapa oscuro (CartoDB dark tiles) a 100vw × 100vh, sin scroll
- [ ] Markers verdes (`#5BBB2A`, 12px, `L.divIcon` custom) en la posición de cada fanfic aprobado
- [ ] Clustering automático; icono de cluster custom (fondo `#1C1F1A`, borde `#5BBB2A`, texto
      `#FAFAF8`, tamaño según cantidad: <10 → 30px, <50 → 40px, >50 → 50px)
- [ ] Overlay circular decorativo (`pointer-events: none`) sin romper la interacción del mapa
- [x] Click en marker → panel lateral con imagen, usuario, ciudad, fecha de aprobación
- [x] Click en cluster → zoom nativo + panel con lista de fanfics del cluster
- [x] Botón "SUBIR MI FANFIC": modal de subida si autenticado, modal de login si no
- [x] Modal de subida: mismo formulario que `MiFanficPage.tsx` (imagen + geocoding Nominatim),
      muestra el fanfic existente del usuario si ya tiene uno
- [x] Panel lateral: 380px fijo en escritorio, 100vw en móvil, slide-in 300ms ease
- [x] Menú de navegación (desktop y móvil) muestra "Mapa Troncodrilo" → `/mapa-troncodrilo`
- [x] `/bola-troncodrilo` sigue cargando por URL directa sin ningún cambio
- [x] `HomePage.tsx`: el split-hero enlaza a `/mapa-troncodrilo`
- [x] `BolaTroncodriloPage.tsx` y `StarField.tsx` sin ninguna modificación

### Fuera de alcance
- Quitar o archivar `/bola-troncodrilo` — sigue existiendo indefinidamente por URL directa
- Migrar el globo 3D a Leaflet — son experiencias distintas, coexisten
- Geolocalización del propio usuario / "centrar en mi ciudad"

---

## Plan

### Backend
- `FanficController@publicIndex`: añadir `reviewed_at` al array de `select()`

### Frontend

**Dependencias**
- `leaflet@1.9.4`, `react-leaflet@5.0.0`, `@react-leaflet/core@3.0.0`,
  `leaflet.markercluster@1.5.3`, `react-leaflet-cluster@4.1.3`
- `@types/leaflet@1.9.22` (devDependency)

**Nuevos**
- `src/lib/mapIcons.ts`: `buildMarkerIcon()` (`L.divIcon` círculo verde) y
  `clusterIconCreateFunction` (tamaño/color según `count`)
- `src/pages/MapaTroncodriloPage.tsx`: `MapContainer` + `TileLayer` (CartoDB dark) +
  `MarkerClusterGroup` + overlay circular decorativo + orquesta el panel lateral
- `src/components/MapSidePanel.tsx`: panel deslizante con 3 modos — detalle de un fanfic, lista de
  un cluster, CTA "Subir mi fanfic" (con login-prompt inline si no autenticado)
- `src/components/FanficUploadModal.tsx`: formulario de subida (imagen + Nominatim), adaptado de
  `MiFanficPage.tsx` en formato modal — `MiFanficPage.tsx` no se modifica

**Modificados**
- `src/api/fanfics.ts`: `getAllFanfics()` — recorre la paginación por cursor de `getFanfics()`
  hasta agotarla (un mapa necesita todos los fanfics, no una página)
- `src/components/Layout.tsx`: `navLinks` — `/bola-troncodrilo` → `/mapa-troncodrilo`,
  "Bola Troncodrilo" → "Mapa Troncodrilo"
- `src/App.tsx`: nueva ruta `/mapa-troncodrilo` dentro del grupo `<Layout />`
- `src/pages/HomePage.tsx`: `SplitHalf` del globo → enlaza y describe `/mapa-troncodrilo`

**Sin tocar**
- `src/pages/BolaTroncodriloPage.tsx`, `src/components/StarField.tsx`
- `src/components/MobileDrawer.tsx` (hereda `navLinks` de `Layout.tsx`)
- `src/pages/MiFanficPage.tsx` (solo lectura, como referencia)

---

## Tasks

### Tarea 1 — Instalación de dependencias
1. [x] `npm install leaflet react-leaflet @react-leaflet/core leaflet.markercluster react-leaflet-cluster` en el contenedor frontend
2. [x] `npm install --save-dev @types/leaflet`
3. [x] Verificar arranque del dev server sin errores (compatibilidad Vite 5 + React 19)

### Tarea 2 — Backend: verificar endpoint de fanfics
4. [x] `FanficController@publicIndex`: añadir `reviewed_at` al `select()`
5. [x] Verificar con datos reales que la respuesta incluye todos los campos necesarios

### Tarea 3 — Página MapaTroncodriloPage.tsx
6. [x] `src/lib/mapIcons.ts`
7. [x] `getAllFanfics()` en `src/api/fanfics.ts`
8. [x] `MapaTroncodriloPage.tsx`: mapa + tiles + overlay circular
9. [x] `MarkerClusterGroup` con markers + clustering
10. [x] `MapSidePanel.tsx`: detalle de fanfic + lista de cluster

### Tarea 4 — Modal de subida de fanfic
11. [x] `FanficUploadModal.tsx` (formulario + Nominatim, adaptado de `MiFanficPage.tsx`)
12. [x] Estado "ya tienes un fanfic" con opción de actualizar
13. [x] Login-prompt inline si no autenticado
14. [x] Integración en `MapSidePanel.tsx`

### Tarea 5 — Navegación
15. [x] `Layout.tsx`: `navLinks` actualizado
16. [x] Confirmar que `MobileDrawer.tsx` refleja el cambio sin edición directa
17. [x] `App.tsx`: ruta `/mapa-troncodrilo`
18. [x] Verificar que `/bola-troncodrilo` sigue intacta

### Tarea 6 — Sección hero en HomePage.tsx
19. [x] `SplitHalf` del globo: enlace + copy actualizados a `/mapa-troncodrilo`

### Tarea 7 — Documentación y cierre
20. [x] `docs/022-mapa-troncodrilo.md`
21. [x] `php artisan test` (vía `docker compose exec backend`) — 19 fallidos / 43 pasados, mismos
        19 fallos preexistentes (`fanfics.image_url` NOT NULL en factory SQLite, feature 014/019),
        sin fallos nuevos — confirmado específicamente en `FanficTest` (los 3 tests de
        `public index` fallan por la misma causa preexistente, no por el cambio de `select()`)
22. [x] Verificar los criterios de aceptación uno a uno
23. [x] `git add . && git commit -m "feat: feature 022 completa — mapa Troncodrilo con Leaflet + clustering" && git push`
