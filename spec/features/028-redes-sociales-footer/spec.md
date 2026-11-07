# 028 — Redes sociales en el footer (administrables)

## Spec

### Qué hace
El admin gestiona desde su panel una lista de redes sociales (alta, edición,
borrado, activar/desactivar, reordenar). El footer público muestra las
activas como iconos con enlace. Si no hay ninguna activa, el bloque no se
renderiza.

### Contexto verificado en el código (no asumido)
- `Footer.tsx` es estático: grid de 3 columnas (logo+tagline / Navegación /
  Información). Se monta una sola vez desde `Layout.tsx`.
- La referencia más cercana en el backend es `HeroSlide` +
  `AdminHeroController` (activar/desactivar, `position`, `reorder`) y en el
  frontend `AdminHeroPage.tsx` (tabla con drag para reordenar, clases
  `btn-admin-primary` / `btn-admin-link-*`). Se reutiliza ese patrón visual.
- Secciones del admin: `lib/adminNav.tsx` (fuente única del sidebar) +
  ruta en `App.tsx` dentro de `AdminRoute`/`AdminLayout`.
- Rutas admin: grupo `['auth:sanctum', 'admin']` con prefijo `admin` en
  `routes/api.php`. Hoy ese grupo **no tiene throttle**.
- Limitadores nombrados por IP: `AppServiceProvider::boot()`.
- No hay librería de iconos instalada (solo leaflet, react-globe.gl,
  zustand…). Los iconos del proyecto son SVG inline.
- `AdminHeroController` valida con `$request->validate()` inline; AGENTS.md
  pide Form Requests → esta feature usa Form Requests.
- CSP de nginx (`img-src`, `connect-src`) no afecta: son `<a>` con SVG
  inline, sin recursos externos.

### Modelo de datos — tabla `social_links`
| Campo       | Tipo                     | Notas |
|-------------|--------------------------|-------|
| id          | bigint PK                |       |
| platform    | string(32)               | Clave de la lista permitida. **Es también la clave de icono** (un único campo; evita platform/icon desincronizados) |
| label       | string(60) nullable      | Texto opcional para `aria-label` (p. ej. "Instagram oficial"). Si es null se usa el nombre estándar de la plataforma |
| url         | string(255)              | Solo `http`/`https` |
| position    | unsignedInteger, def. 0  | Orden ascendente; desempate por `id` |
| is_active   | boolean, def. true       |       |
| timestamps  |                          |       |

Modelo `SocialLink` con `$fillable` explícito y cast de `is_active`. Sin
`$guarded = []`.

### Plataformas permitidas (clave → nombre)
`instagram`, `tiktok`, `x`, `twitter`, `youtube`, `facebook`, `twitch`,
`discord`, `pinterest`, `linkedin`, `github`, `website` (web propia).
Se mantienen `x` y `twitter` como claves separadas porque lo pediste así
(distinto icono: logo X vs. pájaro). La lista vive en **un solo sitio del
backend** (constante en el modelo) y el frontend la recibe del endpoint
admin para el desplegable, para no duplicarla.

### API
**Pública** (sin auth, fuera del grupo `maintenance`: el footer sale en todas
las páginas):
- `GET /api/social-links` → solo `is_active = true`, ordenadas; devuelve
  únicamente `id, platform, label, url` (nada de timestamps ni `is_active`).

**Admin** (`['auth:sanctum', 'admin']` + throttle, prefijo `/api/admin`):
- `GET    /social-links` → todas (activas e inactivas) + lista de
  plataformas permitidas
- `POST   /social-links`
- `PUT    /social-links/{socialLink}`
- `PATCH  /social-links/{socialLink}/toggle`
- `DELETE /social-links/{socialLink}`
- `PUT    /social-links/reorder` (declarada **antes** que `{socialLink}`, mismo
  criterio que el resto del archivo)

### Validación (Form Requests, en servidor)
- `platform`: `required`, `Rule::in(SocialLink::PLATFORMS)`.
- `url`: `required|string|max:255|url:http,https`, más comprobación extra de
  que el esquema parseado sea exactamente `http`/`https` y que no lleve
  credenciales (`user:pass@`). Rechazados: `javascript:`, `data:`, `vbscript:`,
  `ftp:`, `//host` sin esquema, URLs con espacios o caracteres de control.
- `label`: `nullable|string|max:60`.
- `is_active`: `boolean`.
- `position` **no** se acepta en alta/edición: el servidor asigna
  `max(position)+1` al crear; el orden solo cambia vía `reorder`.
- `reorder`: `ids` = array de ids existentes, `distinct`, y debe contener
  **todas** las filas (si no, 422). El servidor asigna `position = índice`
  en una transacción; el cliente no manda posiciones.
- Máximo **12** enlaces en total (422 al crear el 13º) para que el footer no
  se pueda desbordar.
- Siempre `$request->validated()` sobre whitelist; nunca `$request->all()`.

### Rate limiting
- Limitador nombrado `admin-social` (60/min **por IP**, `Limit::...->by($request->ip())`,
  igual que `auth`/`checkout`/`newsletter`) aplicado al conjunto de rutas
  admin de esta feature, todas las verbos incluidos.
- El `GET` público lleva su propio limitador nombrado (`public-read`, 60/min
  por IP). El footer lo pide una vez por carga completa de página, así que
  un usuario normal queda muy lejos del límite.
- No se toca el resto de rutas admin existentes (fuera de alcance).

### Frontend
- **Footer:** nuevo bloque de iconos en la columna del logo, bajo el
  tagline (no cambia el grid de 3 columnas). Cada icono:
  `<a href target="_blank" rel="noopener noreferrer" aria-label="…">` con
  SVG `aria-hidden`. Objetivo táctil ≥ 44×44 px. Mismo estilo que los links
  del footer (`text-canvas/70 hover:text-canvas`). Si la petición falla o no
  hay activas → no se renderiza nada (ni título ni contenedor).
- **Iconos:** componente `SocialIcon` con un mapa `platform → SVG` propio,
  inline, `fill="currentColor"`. Sin dependencias nuevas.
- **Admin:** nueva página `AdminSocialLinksPage` en `/admin/redes-sociales`,
  entrada "Redes sociales" en `adminNav.tsx`. Misma estructura que
  `AdminHeroPage` (formulario inline crear/editar, tabla, Activar/Desactivar,
  Eliminar con `confirm`, reordenar). Reordenar: arrastrar como en Hero **y**
  botones subir/bajar (el drag HTML5 no funciona en táctil).
  Campos del formulario: plataforma (desplegable con icono), URL, etiqueta
  opcional, activo.
- **Seguridad en el cliente:** el frontend también filtra `href` que no
  empiece por `http://`/`https://` antes de renderizarlo (defensa en
  profundidad; la validación real es la del servidor, y esto protege si un
  registro antiguo/manual en BD llegara con otro esquema).

### Seeder
`SocialLinkSeeder` con enlaces de ejemplo, **no** registrado en
`DatabaseSeeder` (no queremos URLs de relleno en producción). Se ejecuta a
mano: `php artisan db:seed --class=SocialLinkSeeder`.

### Fuera de alcance
- Iconos subidos por el admin (solo claves de la lista).
- Validar que el dominio coincida con la plataforma (instagram.com para
  `instagram`, etc.): `x`/`twitter`/acortadores/dominios propios lo hacen
  frágil. Ver pregunta 2.
- Cambios en el resto de endpoints admin o en tests preexistentes.

### Tests (PHPUnit, `tests/Feature/SocialLinkTest.php`)
- Público: lista solo activas y en orden; no expone campos internos;
  vacío → `[]`.
- Autorización de **cada** verbo admin: sin sesión → 401; usuario normal → 403.
- Validación: rechaza `javascript:alert(1)`, `data:`, `ftp:`, `//evil.com`,
  URL con credenciales, plataforma fuera de lista, url > 255, label > 60;
  acepta `https://…` y `http://…`.
- Alta asigna `position` al final; `position` enviada por el cliente se ignora.
- Toggle, delete, update; reorder correcto y reorder incompleto/duplicado → 422.
- Límite de 12 → 422 en el 13º.
- Throttle: la petición nº 61 desde la misma IP → 429 (mismo patrón que
  `NewsletterTest`).
- Frontend: sin suite de tests (ver AGENTS.md) → `eslint`, `vite build` y QA
  manual con Playwright (footer con/sin enlaces, `target`/`rel`/`aria-label`,
  panel admin completo, vista 375×667).

### Observaciones para ti (no son parte del spec)
1. **AGENTS.md y `security-baseline.md`**: los he leído y ambos describen
   Troncodrilo Shop; `grep -i climbforge` no encuentra nada. No hay
   contenido de otro proyecto que ignorar.
2. **Working tree sucio**: hay cambios sin commitear en `axios.ts`,
   `HomePage.tsx` y `StorePage.tsx` que no son de esta feature. Habrá que
   no mezclarlos en el commit de la 028 (los añadiré por ruta, no con
   `git add -A`).
3. **Rama**: estás en `prod` y la principal es `main`. Antes de implementar
   conviene saber en qué rama quieres el commit/push de esta feature.

### Preguntas abiertas (necesito tu OK o corrección)
1. **Un campo `platform` = clave de icono** en vez de dos columnas
   separadas. ¿Te vale? (Recomendado: evita estados incoherentes.)
2. **Dominio vs. plataforma**: ¿lo dejo sin validar (recomendado) o exiges
   que `instagram` solo acepte `instagram.com`, etc.?
3. **Máximo 12 enlaces** y **posibilidad de repetir plataforma** (p. ej. dos
   Instagram). ¿Correcto, o prefieres una por plataforma?
4. Límites de throttle propuestos (60/min por IP, admin y público). ¿Algún
   otro valor?
