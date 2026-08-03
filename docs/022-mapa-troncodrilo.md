# 022 — Mapa Troncodrilo

## Resumen

Nueva página `/mapa-troncodrilo`: mapa 2D interactivo (Leaflet + tiles oscuros de CartoDB) que
sustituye funcionalmente a `/bola-troncodrilo` (globo 3D) en el menú de navegación. Cada fanfic
aprobado aparece como marker verde en su ciudad; markers cercanos se agrupan en clusters con
tamaño proporcional a la cantidad. Click en marker abre un panel lateral con el detalle; click en
cluster hace zoom y además muestra la lista de fanfics del grupo. Botón "Subir mi fanfic" (modal
de subida o de login según el estado de sesión). `/bola-troncodrilo` sigue existiendo sin cambios,
accesible por URL directa.

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/lib/mapIcons.ts` | `buildFanficMarkerIcon()` y `clusterIconCreateFunction()` — `L.divIcon` custom |
| `src/pages/MapaTroncodriloPage.tsx` | Mapa, `MarkerClusterGroup`, overlay circular, orquesta el panel y los modales |
| `src/components/MapSidePanel.tsx` | Panel deslizante: detalle de fanfic / lista de cluster / confirmación de subida |
| `src/components/FanficUploadModal.tsx` | Formulario de subida (imagen + Nominatim), adaptado de `MiFanficPage.tsx` en formato modal |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/Http/Controllers/FanficController.php` | `publicIndex()`: añadido `reviewed_at` al `select()` |
| `src/api/fanfics.ts` | `getAllFanfics()` — recorre la paginación por cursor hasta agotarla |
| `src/components/Layout.tsx` | `navLinks`: `/bola-troncodrilo` → `/mapa-troncodrilo`, "Mapa Troncodrilo" |
| `src/App.tsx` | Nueva ruta `/mapa-troncodrilo`; `/bola-troncodrilo` intacta |
| `src/pages/HomePage.tsx` | Split-hero del globo: enlace y copy actualizados |

**Sin tocar**: `src/pages/BolaTroncodriloPage.tsx`, `src/components/StarField.tsx`,
`src/components/MobileDrawer.tsx` (hereda `navLinks` de `Layout.tsx`),
`src/pages/MiFanficPage.tsx` (solo se leyó como referencia).

---

## Por qué Leaflet + CartoDB dark tiles

- **Sin API key, 100% gratuito**: a diferencia de Mapbox GL (requiere cuenta y token, con límite
  de uso gratuito acotado), los tiles de CartoDB (`{s}.basemaps.cartocdn.com/dark_all/...`) son
  públicos y no piden autenticación. Suficiente para el volumen de tráfico de este proyecto.
- **Leaflet es la librería de mapas 2D más madura del ecosistema JS** — `react-leaflet` (el
  wrapper oficial para React) llegó a la v5 con soporte nativo para React 19, sin parches ni
  `--legacy-peer-deps`.
- **Estética "vista espacial" sin coste**: el estilo `dark_all` de CartoDB ya tiene el aspecto
  oscuro/minimalista que pedía el encargo, sin necesidad de un estilo de mapa custom (que sí
  requeriría una cuenta de pago en la mayoría de proveedores).

## Cómo funciona el clustering

`react-leaflet-cluster` envuelve `leaflet.markercluster` (el plugin de clustering más usado del
ecosistema Leaflet, no un reimplementación propia):

1. Cada fanfic aprobado se renderiza como un `<Marker>` con el icono verde custom
   (`buildFanficMarkerIcon()`) dentro de un `<MarkerClusterGroup>`.
2. `leaflet.markercluster` agrupa automáticamente los markers que caen dentro de
   `maxClusterRadius` (60px en este proyecto) al nivel de zoom actual, y renderiza el icono de
   cluster vía `iconCreateFunction` (`clusterIconCreateFunction()` en `mapIcons.ts`), cuyo tamaño
   depende de `cluster.getChildCount()`: <10 → 30px, <50 → 40px, ≥50 → 50px.
3. **Click en cluster**: `zoomToBoundsOnClick` (activado por defecto en `leaflet.markercluster`)
   hace zoom para separar los markers del grupo — sin código propio. Además,
   `MapaTroncodriloPage.tsx` escucha el evento nativo `clusterclick` en la instancia de
   `L.MarkerClusterGroup` (vía `ref` + `.on('clusterclick', ...)`) para abrir el panel lateral con
   la lista de fanfics del cluster, usando `cluster.getAllChildMarkers()` para recuperar los
   markers agrupados.
4. Cada `<Marker>` lleva el `Fanfic` original adjunto a la instancia de Leaflet
   (`marker.fanficData`, vía el `ref` del propio `<Marker>`) porque `getAllChildMarkers()` solo
   devuelve `L.Marker[]` sin metadatos propios — es la forma de recuperar "qué fanfic es este
   marker" desde el evento de cluster.

## Cómo añadir nuevos estilos de tiles en el futuro

Cambiar de proveedor de tiles es un cambio de una línea en `MapaTroncodriloPage.tsx`:

```tsx
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTRIBUTION = '...'
```

Otras opciones gratuitas sin API key (todas de CartoDB, mismo patrón de URL):
- `light_all` — tiles claros
- `rastertiles/voyager` — estilo a color, más detallado

Si se quiere un proveedor con API key en el futuro (Mapbox, Stadia Maps, etc.), basta con
sustituir `DARK_TILE_URL`/`DARK_TILE_ATTRIBUTION` y añadir la key como variable de entorno del
frontend (`import.meta.env.VITE_...`) — el resto del mapa (`MapContainer`, `MarkerClusterGroup`,
iconos, panel) no depende del proveedor de tiles.

## Diferencias con `/bola-troncodrilo` (por qué se mantiene)

| | `/bola-troncodrilo` | `/mapa-troncodrilo` |
|---|---|---|
| Motor | `react-globe.gl` (WebGL, globo 3D) | Leaflet (Canvas/DOM, mapa 2D) |
| Clustering | `supercluster` a mano, recalculado en cada cambio de altitud/azimut | `leaflet.markercluster`, nativo del plugin |
| Estética | Globo 3D con textura de estrellas de fondo (`StarField.tsx`, WebGL) | Mapa plano oscuro con overlay circular decorativo (CSS puro) |
| Navegación | Rotación/zoom orbital (`OrbitControls`) | Pan/zoom estándar de mapa web |
| Coste de carga | Más pesado (WebGL + textura del globo + `three-globe`) | Más ligero (tiles rasterizados bajo demanda) |

Son dos experiencias deliberadamente distintas, no una migración de una a otra — por eso
`/bola-troncodrilo` **no se ha tocado ni eliminado**: sigue siendo la experiencia "globo 3D"
completa para quien llegue por enlace directo o marcador guardado, mientras `/mapa-troncodrilo`
es la que se promociona activamente desde la navegación y el hero de la home por ser más ligera y
más cómoda de usar en un panel lateral con detalle (el globo no tenía sitio natural para un panel
de 380px fijo sin tapar la esfera).

---

## Decisiones técnicas

### 1. `@types/leaflet.markercluster` — dependencia no listada en el encargo original, necesaria
El encargo no incluía este paquete en la lista de instalación, pero sin él `tsc` falla: `@types/leaflet` no declara `MarkerClusterGroupOptions` ni `MarkerCluster`, que `react-leaflet-cluster`
referencia en sus propios tipos. Se instaló como devDependency adicional — no cambia el
comportamiento en runtime, solo aporta los tipos que faltaban.

### 2. `reviewed_at` en vez de reutilizar `created_at` para "fecha de aprobación"
El encargo original no mencionaba explícitamente `reviewed_at` entre los campos requeridos, pero
el panel pide "fecha de aprobación" — que es conceptualmente distinta de `created_at` (fecha de
solicitud). Se añadió al `select()` de `FanficController@publicIndex`.

### 3. `getAllFanfics()` — el mapa necesita todos los datos, no una página
`GET /api/fanfics` está paginado por cursor (20 por página), pensado originalmente para carga
progresiva en el globo 3D. Un mapa 2D con clustering necesita ver todos los puntos a la vez para
agrupar correctamente — `getAllFanfics()` recorre las páginas hasta agotarlas antes de renderizar
el primer marker.

### 4. CTA flotante "Subir mi fanfic" además del botón dentro del panel
El encargo solo especificaba el botón dentro del panel de detalle (visible únicamente tras
seleccionar un marker). Se añadió también un botón flotante en la esquina inferior derecha del
mapa (mismo patrón que ya usaba `/bola-troncodrilo`) para que un usuario nuevo pueda subir su
fanfic sin depender de que ya existan otros fanfics en el mapa para poder hacer click en algo
primero. Se oculta mientras el panel está abierto para no solaparse.

### 5. Modal de login reutiliza el patrón de `LandingProductCard.tsx`, sin componente compartido nuevo
No existía un `LoginModal` compartido en el proyecto — solo el patrón inline de
`LandingProductCard.tsx` ("Inicia sesión para…" + enlaces a `/login`/`/register`). Se replicó ese
mismo patrón visual y de copy en `MapaTroncodriloPage.tsx` en vez de crear una abstracción nueva
para dos puntos de uso.

### 6. `leaflet.markercluster/dist/MarkerCluster.css` sí se importa, `MarkerCluster.Default.css` no
El primero solo contiene transiciones (fusión/separación de clusters, patas de spiderfy) — mejora
la animación sin afectar la apariencia. El segundo define el círculo de color por defecto de los
clusters, completamente sustituido por `clusterIconCreateFunction`; importarlo no rompería nada,
pero es peso muerto.

### 7. Verificación end-to-end sin navegador real disponible
Este entorno no tiene un navegador real ni `chromium-cli` para capturar pantallas. La verificación
se hizo por otras vías con señal fuerte: `tsc --noEmit` limpio, `eslint` limpio (aparte de un
patrón preexistente ya presente en `MiFanficPage.tsx`, no introducido por esta feature), y
forzando al dev server de Vite a compilar cada módulo nuevo vía `curl` (los errores de
transformación de Vite —imports rotos, JSX inválido— habrían aparecido en los logs del contenedor
y no aparecieron). No sustituye una prueba visual real; se recomienda abrir `/mapa-troncodrilo` en
un navegador antes de dar la feature por verificada al 100 %.

---

## Cómo probar manualmente

1. **Carga del mapa**: ir a `/mapa-troncodrilo` → debe verse un mapa oscuro a pantalla completa,
   centrado en `[20, 0]` con zoom 3, sin scroll de página.
2. **Overlay circular**: debe verse un anillo verde translúcido centrado en el mapa; no debe
   impedir hacer pan/zoom sobre el mapa (confirma `pointer-events: none`).
3. **Markers**: cada fanfic aprobado debe verse como un círculo verde de 12px en su ciudad.
4. **Clustering**: con zoom out, los markers cercanos deben agruparse en un círculo oscuro con
   borde verde y el número de fanfics agrupados.
5. **Click en marker**: abre el panel lateral (380px en escritorio, 100% en móvil) con imagen,
   nombre de usuario, ciudad, fecha de aprobación y botón "Subir mi fanfic".
6. **Click en cluster**: el mapa hace zoom hacia el grupo Y el panel muestra la lista de fanfics
   del cluster (thumbnail + usuario + ciudad + fecha); click en un item abre su detalle completo.
7. **Subir fanfic (autenticado)**: botón "Subir mi fanfic" → modal con el formulario de imagen +
   búsqueda de ciudad (Nominatim) → al guardar, el panel muestra la confirmación de éxito.
8. **Subir fanfic (sin sesión)**: mismo botón → modal de "Inicia sesión para subir tu fanfic" con
   enlaces a `/login` y `/register`.
9. **Navegación**: el menú (escritorio y móvil) debe mostrar "Mapa Troncodrilo" apuntando a
   `/mapa-troncodrilo` — no debe quedar ningún "Bola Troncodrilo" en el menú.
10. **`/bola-troncodrilo` intacta**: navegar directamente a esa URL — debe cargar el globo 3D
    exactamente igual que antes de esta feature.
11. `php artisan test` — sin fallos nuevos.
