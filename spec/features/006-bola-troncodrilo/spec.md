# 006 — Bola Troncodrilo (mapa de fanfics)

## Spec

### Qué hace
Mapa interactivo del mundo (estilo Radio Garden) donde cada usuario
registrado puede subir **un único fanfic** asociado a una ubicación
geográfica. El fanfic solo es visible en el mapa tras ser aprobado por
un admin.

### Criterios de aceptación
- [ ] Un usuario autenticado puede subir su fanfic (título, contenido, ubicación) solo si no tiene ya uno (1 por usuario)
- [ ] Al intentar subir un segundo fanfic, el sistema lo rechaza con mensaje claro
- [ ] El fanfic nace en estado `pending` y no es visible públicamente
- [ ] Un usuario puede ver el estado de su propio fanfic (`pending`, `approved`, `rejected`) y el motivo si fue rechazado
- [ ] Un usuario puede editar y reenviar su fanfic mientras esté en `pending` o `rejected` (vuelve a `pending` al reenviar)
- [ ] Solo un admin puede aprobar o rechazar un fanfic, con motivo opcional en caso de rechazo
- [ ] El mapa público muestra únicamente fanfics con `status = approved`, posicionados según `latitude`/`longitude`
- [ ] Al hacer click/tap en un punto del mapa, se muestra el fanfic correspondiente (título, autor, contenido)
- [ ] El admin tiene una vista de moderación con la cola de fanfics `pending`

### Fuera de alcance
- Comentarios o votos sobre los fanfics (post-MVP)
- Edición de fanfics ya aprobados sin volver a moderación (toda edición resetea a `pending`)

---

## Plan

### Backend
- Migración `fanfics`: id, user_id (FK, **UNIQUE**), title, content,
  latitude, longitude, status enum(pending,approved,rejected),
  rejection_reason (nullable), reviewed_by (FK users nullable),
  reviewed_at (nullable), timestamps
- Modelo `Fanfic` con relaciones `belongsTo User` (autor) y `belongsTo User` (reviewer)
- Endpoints usuario: `POST /api/fanfics` (falla si ya existe uno), `PUT /api/fanfics/{id}` (editar el propio, resetea a pending), `GET /api/fanfics/mine`
- Endpoint público: `GET /api/fanfics?status=approved` (para pintar el mapa)
- Endpoints admin: `GET /api/admin/fanfics?status=pending`, `PATCH /api/admin/fanfics/{id}/approve`, `PATCH /api/admin/fanfics/{id}/reject`
- Policy: un usuario solo edita el suyo; solo admin aprueba/rechaza

### Frontend
- Página `/bola-troncodrilo`: globo/mapa interactivo
- Decisión técnica pendiente: `react-globe.gl` (visual real estilo Radio Garden, requiere WebGL) vs alternativa 2D más ligera para móvil — se evalúa al empezar esta feature
- Al hacer click en un punto aprobado, modal/panel con el fanfic
- Página `/mi-fanfic`: formulario crear/editar el propio fanfic, selector de ubicación, estado visible
- Panel admin `/admin/fanfics`: cola de pendientes con aprobar/rechazar

### Dependencia
Requiere `001-autenticacion` completa.

---

## Tasks

1. [ ] Migración `fanfics` con constraint unique en `user_id`
2. [ ] Modelo `Fanfic` con relaciones y scopes (`approved()`, `pending()`)
3. [ ] `FanficController` (store, update propio, mine) con regla "solo uno por usuario"
4. [ ] `FanficController@publicIndex` (solo aprobados, para el mapa)
5. [ ] `AdminFanficController` (listado pending, approve, reject con motivo)
6. [ ] Policy `FanficPolicy`
7. [ ] Tests Feature: no se puede crear un segundo fanfic, edición resetea a pending, solo admin aprueba/rechaza, mapa público solo devuelve aprobados
8. [ ] Frontend: evaluar e instalar librería de mapa/globo
9. [ ] Frontend: página `/bola-troncodrilo` con puntos de fanfics aprobados
10. [ ] Frontend: página `/mi-fanfic` (crear/editar/estado)
11. [ ] Frontend: panel admin de moderación de fanfics
12. [ ] Verificar los 9 criterios de aceptación