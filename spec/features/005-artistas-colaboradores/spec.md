# 005 — Artistas Colaboradores

## Spec

### Qué hace
Apartado público donde se muestran los artistas que colaboran
oficialmente con Troncodrilo, con su perfil y, si aplica, sus
productos asociados en la tienda.

### Criterios de aceptación
- [ ] Cualquier visitante puede ver el listado de artistas colaboradores activos
- [ ] Cada artista tiene una página de perfil con nombre, bio, avatar y enlaces a redes sociales
- [ ] Si un artista tiene productos asociados, se muestran en su perfil
- [ ] Solo artistas con `is_active = true` aparecen en el listado público
- [ ] Un admin puede crear, editar y desactivar artistas

### Fuera de alcance
- Dashboard propio para que el artista gestione su perfil sin pasar por admin (post-MVP)
- Sistema de comisiones o reparto de ingresos con artistas

---

## Plan

### Backend
- Migración `artists`: id, user_id (FK nullable), name, bio, avatar_url, social_links (json), is_active, timestamps
- Modelo `Artist` con relación `hasMany Product`
- Endpoints públicos: `GET /api/artists`, `GET /api/artists/{id}`
- Endpoints admin: `POST /api/admin/artists`, `PUT /api/admin/artists/{id}`, `DELETE /api/admin/artists/{id}`
- Form Request `ArtistRequest`

### Frontend
- Página `/artistas` con grid de tarjetas de artista
- Página `/artistas/:id` con perfil completo + productos asociados
- Panel admin `/admin/artistas` (listado + formulario)

### Dependencia
Requiere `001-autenticacion` y `002-catalogo-productos` completas
(necesita la relación `artist_id` en productos).

---

## Tasks

1. [ ] Migración `artists`
2. [ ] Modelo `Artist` con relaciones
3. [ ] `ArtistController` (público + admin)
4. [ ] `ArtistRequest` con validación
5. [ ] Seeder de artistas demo
6. [ ] Tests Feature: listado público, creación bloqueada sin rol admin
7. [ ] Frontend: página `/artistas` y perfil de artista
8. [ ] Frontend: panel admin de artistas
9. [ ] Verificar los criterios de aceptación